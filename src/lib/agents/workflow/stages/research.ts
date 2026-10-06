import "server-only";
import type { Json, TablesInsert } from "@/lib/supabase/database.types";
import { RESEARCH_ROLES } from "@/lib/agents/roles";
import { WorkOutputSchema, type WorkOutput } from "@/lib/agents/schemas";
import { researchPrompt } from "@/lib/agents/prompts/tasks";
import { normalizeUrl } from "@/lib/agents/dedupe";
import { score100 } from "@/lib/agents/scoring";
import { AiNotConfiguredError } from "@/lib/ai/errors";
import type { AgentEmployee } from "@/lib/agents/agent";
import type { WorkflowContext } from "../context";
import { failTask, runLimited, updateTask, type TaskRow } from "../helpers";

/** 출처 정리: http(s) 만 허용하고, 실제 검색에서 수집된 URL 과 일치하면 verified */
export function sanitizeOutput(output: WorkOutput, retrievedUrls: string[]) {
  const retrieved = new Set(retrievedUrls.map(normalizeUrl).filter((u): u is string => Boolean(u)));
  const sources = output.sources
    .map((s) => ({ ...s, normalized: normalizeUrl(s.url) }))
    .filter((s): s is typeof s & { normalized: string } => Boolean(s.normalized))
    .map((s) => ({ ...s, verified: retrieved.has(s.normalized) }));
  const verifiedSet = new Set(sources.filter((s) => s.verified).map((s) => s.normalized));
  const findings = output.findings.map((f) => {
    const urls = f.source_urls.map(normalizeUrl).filter((u): u is string => Boolean(u));
    const hasVerified = urls.some((u) => verifiedSet.has(u));
    return {
      ...f,
      source_urls: urls,
      importance: score100(f.importance),
      novelty: score100(f.novelty),
      practical_value: score100(f.practical_value),
      business_potential: score100(f.business_potential),
      sns_potential: score100(f.sns_potential),
      developer_impact: score100(f.developer_impact),
      // 출처가 하나도 확인되지 않으면 추측으로 강제 표시 (AI 추측과 실제 Source 구분)
      is_speculation: f.is_speculation || urls.length === 0 || (retrieved.size > 0 && !hasVerified),
      has_verified_source: hasVerified,
    };
  });
  return { ...output, confidence: score100(output.confidence), sources, findings };
}

export type SanitizedOutput = ReturnType<typeof sanitizeOutput>;

async function runResearchTask(ctx: WorkflowContext, task: TaskRow, employee: AgentEmployee) {
  await updateTask(ctx.db, ctx.company.id, task.id, { status: "WORKING", started_at: new Date().toISOString() });
  await employee.setStatus("researching", task.id);

  const keywords = task.keywords.length ? task.keywords : [task.title];
  const result = await employee.run({
    purpose: "research",
    taskId: task.id,
    schema: WorkOutputSchema,
    schemaName: "research_output",
    include: ["company", "ceoPreferences", "memory", "projects", "trends"],
    trendCategory: employee.role === "vibe_coding_researcher" ? "vibe_coding" : employee.role === "market_researcher" ? "market" : "ai_trend",
    webSearchQueries: keywords,
    taskPrompt: researchPrompt({ title: task.title, description: task.description ?? "", keywords }),
  });

  await employee.setStatus("writing", task.id);
  const output = sanitizeOutput(result.output, result.retrievedUrls);

  const { data: tr, error } = await ctx.db
    .from("task_results")
    .insert({
      company_id: ctx.company.id,
      task_id: task.id,
      employee_id: employee.id,
      stage: "research",
      output: { ...output, retrieved_url_count: result.retrievedUrls.length } as unknown as Json,
      summary: output.summary,
      confidence: output.confidence,
      model: employee.model,
    })
    .select("id")
    .single();
  if (error || !tr) throw new Error(`조사 결과 저장 실패: ${error?.message}`);

  if (output.sources.length) {
    const rows: TablesInsert<"sources">[] = output.sources.map((s) => ({
      company_id: ctx.company.id,
      task_result_id: tr.id,
      title: s.title.slice(0, 300),
      url: s.url,
      normalized_url: s.normalized,
      publisher: s.publisher,
      published_at: s.published_at && !Number.isNaN(Date.parse(s.published_at)) ? new Date(s.published_at).toISOString() : null,
      source_type: s.source_type,
      is_verified: s.verified,
    }));
    // 같은 URL 은 회사당 1개만 유지 (중복 뉴스 제거 1단계)
    const { error: srcErr } = await ctx.db.from("sources").upsert(rows, { onConflict: "company_id,normalized_url", ignoreDuplicates: true });
    if (srcErr) console.error("[research] source upsert failed", srcErr.message);
  }

  await updateTask(ctx.db, ctx.company.id, task.id, { status: "REVIEW", last_error: null });
  await employee.setStatus("working", null);
  ctx.log(`🔍 ${employee.name}: "${task.title}" — Finding ${output.findings.length}개, 출처 ${output.sources.length}개`);
}

export async function researchStage(ctx: WorkflowContext) {
  const { data: tasks, error } = await ctx.db
    .from("tasks")
    .select("*")
    .eq("company_id", ctx.company.id)
    .eq("run_id", ctx.run.id)
    .eq("task_type", "research")
    // 단계 재시도 시 실패한 업무도 재시도 (업무당 최대 2회 — 무한 재시도 금지)
    .or("status.in.(TODO,WORKING),and(status.eq.FAILED,retry_count.lt.2)");
  if (error) throw new Error(error.message);
  if (!tasks?.length) {
    ctx.log("조사할 업무가 없습니다.");
    return;
  }

  const researchers = ctx.employees.filter((e) => RESEARCH_ROLES.includes(e.role));
  const jobs = tasks
    .map((task) => {
      const employee =
        ctx.employees.find((e) => e.id === task.assigned_employee) ?? researchers[0];
      return employee ? { task, employee } : null;
    })
    .filter((j): j is { task: TaskRow; employee: AgentEmployee } => j !== null);

  // Research Agent 동시 실행 (최대 3명)
  const results = await runLimited(jobs, 3, async ({ task, employee }) => {
    try {
      await runResearchTask(ctx, task, employee);
    } catch (err) {
      await failTask(ctx, task, err);
      await employee.setStatus("working", null);
      throw err;
    }
  });

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length === results.length && failures.length > 0) {
    const first = failures[0].reason;
    if (first instanceof AiNotConfiguredError) throw first;
    throw new Error(`모든 리서치 업무가 실패했습니다: ${first instanceof Error ? first.message : String(first)}`);
  }
}
