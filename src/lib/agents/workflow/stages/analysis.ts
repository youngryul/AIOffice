import "server-only";
import type { Json, TablesInsert } from "@/lib/supabase/database.types";
import { AnalysisOutputSchema } from "@/lib/agents/schemas";
import { analysisPrompt } from "@/lib/agents/prompts/tasks";
import { score100 } from "@/lib/agents/scoring";
import { formatTrends, recentTrends } from "@/lib/tools/trendSearch";
import type { WorkflowContext } from "../context";
import { ensureTask, failTask, truncate, updateTask, validIndex } from "../helpers";
import type { SanitizedOutput } from "./research";

export async function runTrends(ctx: WorkflowContext, limit = 12) {
  // 오늘 Run 에서 팩트체크를 통과한 트렌드 (rejected 는 애초에 등록되지 않음)
  return recentTrends(ctx.db, ctx.company.id, { runId: ctx.run.id, days: 2, limit });
}

export async function analysisStage(ctx: WorkflowContext) {
  const analyst = ctx.byRole("business_analyst");
  if (!analyst) {
    ctx.log("사업기회 분석가가 없어 분석 단계를 건너뜁니다.");
    return;
  }
  const trends = await runTrends(ctx);
  if (!trends.length) {
    ctx.log("검증된 트렌드가 없어 사업 분석을 건너뜁니다.");
    return;
  }

  const task = await ensureTask(ctx, {
    employeeId: analyst.id,
    taskType: "analysis",
    title: "오늘 리서치 기반 사업 기회 분석",
    description: "검증된 트렌드에서 사업 기회를 찾고 평가한다.",
    department: analyst.row.department,
  });
  await updateTask(ctx.db, ctx.company.id, task.id, { status: "WORKING", started_at: new Date().toISOString() });
  await analyst.setStatus("researching", task.id);

  // 시장조사 Finding (market_researcher 결과) 을 분석 근거로 함께 전달 — Previous Employee Output
  const { data: marketResults } = await ctx.db
    .from("task_results")
    .select("output, tasks!inner(run_id), employees(role)")
    .eq("company_id", ctx.company.id)
    .eq("stage", "research")
    .eq("review_status", "passed")
    .eq("tasks.run_id", ctx.run.id);
  const marketFindings = (marketResults ?? [])
    .flatMap((r) => (r.output as unknown as SanitizedOutput).findings ?? [])
    .filter((f) => f.category === "market" && !f.is_speculation)
    .map((f) => `- ${f.title}: ${truncate(f.summary, 300)}`)
    .join("\n");

  try {
    const { output } = await analyst.run({
      purpose: "business_analysis",
      taskId: task.id,
      schema: AnalysisOutputSchema,
      schemaName: "business_analysis",
      include: ["company", "ceoPreferences", "memory", "projects", "records"],
      taskPrompt: analysisPrompt({ trends: formatTrends(trends, true), marketFindings: marketFindings || "(별도 시장 Finding 없음)" }),
    });
    await analyst.setStatus("writing", task.id);

    const rows: TablesInsert<"opportunities">[] = output.opportunities.map((o) => {
      const ti = validIndex(o.trend_index, trends.length);
      return {
        company_id: ctx.company.id,
        run_id: ctx.run.id,
        trend_id: ti !== null ? trends[ti].id : null,
        title: o.title.slice(0, 200),
        trend: o.trend,
        problem: o.problem,
        solution: o.solution,
        target_user: o.target_user,
        market: o.market,
        competition: o.competition,
        business_model: o.revenue_model,
        product_idea: `${o.product_idea}\n\nOpportunity: ${o.opportunity}`,
        difficulty: o.difficulty,
        development_time: o.development_time,
        opportunity_score: score100(o.potential_score),
        status: "IDEA",
        created_by: analyst.id,
      };
    });
    if (rows.length) {
      const { error } = await ctx.db.from("opportunities").insert(rows);
      if (error) throw new Error(`사업 기회 저장 실패: ${error.message}`);
    }

    await ctx.db.from("task_results").insert({
      company_id: ctx.company.id,
      task_id: task.id,
      employee_id: analyst.id,
      stage: "analysis",
      output: output as unknown as Json,
      summary: output.summary,
      confidence: score100(output.confidence),
      review_status: "passed",
      model: analyst.model,
    });
    await updateTask(ctx.db, ctx.company.id, task.id, { status: "DONE", completed_at: new Date().toISOString() });
    ctx.log(`💼 ${analyst.name}: 사업 기회 ${rows.length}개 발굴`);
  } catch (err) {
    await failTask(ctx, task, err);
  } finally {
    await analyst.setStatus("working", null);
  }
}
