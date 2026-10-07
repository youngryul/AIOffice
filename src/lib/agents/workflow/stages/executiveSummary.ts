import "server-only";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { toJson } from "@/lib/supabase/json";
import { ExecutiveSummarySchema, type AnalysisOutput, type ExecutiveSummaryOutput } from "@/lib/agents/schemas";
import { executiveSummaryPrompt } from "@/lib/agents/prompts/tasks";
import { enqueueNotionSync, type NotionEntityType } from "@/lib/tools/notion";
import { recomputeEmployeePerformance } from "@/lib/services/performance";
import type { BriefItem, CompetitorMovement, ThingToTry } from "@/lib/types/domain";
import type { WorkflowContext } from "../context";
import { ensureTask, failTask, truncate, updateTask, validIndex } from "../helpers";
import { runTrends } from "./analysis";

/**
 * Executive Summary → CEO Approval Queue → Daily Brief → Notion Sync Queue.
 * TOP N 선정은 AI 가 아니라 점수로 결정한다 (재현 가능 / 환각 방지).
 */
export async function executiveSummaryStage(ctx: WorkflowContext) {
  const trends = await runTrends(ctx, 20);
  const aiTrends = trends.filter((t) => t.category !== "vibe_coding").slice(0, 5);
  const vibeTrends = trends.filter((t) => t.category === "vibe_coding").slice(0, 3);

  const [{ data: opps }, { data: contents }, { data: execMinutes }, { data: analysisResults }] = await Promise.all([
    ctx.db.from("opportunities").select("*").eq("company_id", ctx.company.id).eq("run_id", ctx.run.id).order("opportunity_score", { ascending: false }).limit(3),
    ctx.db.from("content_ideas").select("*").eq("company_id", ctx.company.id).eq("run_id", ctx.run.id).order("total_score", { ascending: false }).limit(5),
    ctx.db.from("meeting_minutes").select("decision, consensus, action_items, meetings!inner(run_id, type)").eq("company_id", ctx.company.id).eq("meetings.run_id", ctx.run.id).eq("meetings.type", "executive").limit(1).maybeSingle(),
    ctx.db.from("task_results").select("output, tasks!inner(run_id)").eq("company_id", ctx.company.id).eq("stage", "analysis").eq("tasks.run_id", ctx.run.id).limit(1),
  ]);
  const topOpps = opps ?? [];
  const topContents = contents ?? [];
  const analysis = analysisResults?.[0]?.output as unknown as AnalysisOutput | undefined;
  const competitorMovement: CompetitorMovement[] = (analysis?.competitor_movements ?? []).slice(0, 5);

  const exec = ctx.executive();
  let summary: ExecutiveSummaryOutput | null = null;
  let taskId: string | null = null;
  if (exec) {
    await exec.setStatus("writing");
    const task = await ensureTask(ctx, {
      employeeId: exec.id,
      taskType: "summary",
      title: "CEO Daily Brief 및 결재 안건 작성",
      description: "하루 업무 종합, Executive Summary, 결재 안건 생성",
      department: exec.row.department,
    });
    taskId = task.id;
    await updateTask(ctx.db, ctx.company.id, task.id, { status: "WORKING", started_at: new Date().toISOString() });
    try {
      const res = await exec.run({
        purpose: "executive_summary",
        taskId: task.id,
        schema: ExecutiveSummarySchema,
        schemaName: "executive_summary",
        include: ["company", "ceoPreferences", "memory", "projects"],
        taskPrompt: executiveSummaryPrompt({
          aiTrends: aiTrends.map((t, i) => `[${i}] ${t.name} (score ${t.current_score}): ${truncate(t.summary, 250)}`).join("\n") || "(없음)",
          vibeTrends: vibeTrends.map((t, i) => `[${i}] ${t.name} (score ${t.current_score}${t.try_worthy ? `, 써볼 가치: ${t.try_reason ?? "있음"}` : ""}): ${truncate(t.summary, 250)}`).join("\n") || "(없음)",
          opportunities: topOpps.map((o, i) => `[${i}] ${o.title} (score ${o.opportunity_score}, 난이도 ${o.difficulty}): ${truncate(o.problem, 200)}`).join("\n") || "(없음)",
          contents: topContents.map((c, i) => `[${i}] [${c.platform}] ${c.title} (score ${c.total_score}) — ${truncate(c.hook, 120)}`).join("\n") || "(없음)",
          meetingDecision: execMinutes ? `${execMinutes.decision ?? ""}\n합의: ${execMinutes.consensus ?? ""}` : "(회의 없음)",
          competitorMovements: competitorMovement.map((c) => `- ${c.name}: ${c.movement} → ${c.implication}`).join("\n") || "(없음)",
        }),
      });
      summary = res.output;
    } catch (err) {
      await failTask(ctx, task, err);
      ctx.log("⚠️ Executive Summary AI 실패 → 점수 기반 요약으로 Brief 를 생성합니다.");
    }
  }

  // ---- CEO Approval Queue ----
  const approvalIds: string[] = [];
  const canRequestApproval = exec?.can("request_approval") ?? false;
  if (summary && canRequestApproval) {
    for (const a of summary.approvals.slice(0, 4)) {
      let relatedType: string | null = null;
      let relatedId: string | null = null;
      let ownerId: string | null = exec?.id ?? null;
      if (a.ref_kind === "trend") {
        const i = validIndex(a.ref_index, aiTrends.length);
        if (i !== null) [relatedType, relatedId] = ["trend", aiTrends[i].id];
      } else if (a.ref_kind === "opportunity") {
        const i = validIndex(a.ref_index, topOpps.length);
        if (i !== null) [relatedType, relatedId, ownerId] = ["opportunity", topOpps[i].id, topOpps[i].created_by ?? ownerId];
      } else if (a.ref_kind === "content") {
        const i = validIndex(a.ref_index, topContents.length);
        if (i !== null) [relatedType, relatedId, ownerId] = ["content_idea", topContents[i].id, topContents[i].created_by ?? ownerId];
      }
      const row: TablesInsert<"approvals"> = {
        company_id: ctx.company.id,
        run_id: ctx.run.id,
        title: a.title.slice(0, 200),
        type: a.type,
        summary: a.summary,
        reason: a.reason,
        impact: a.impact,
        recommendation: a.recommendation,
        alternatives: a.alternatives,
        cost: a.cost,
        employee_id: ownerId,
        related_entity_type: relatedType,
        related_entity_id: relatedId,
      };
      const { data, error } = await ctx.db.from("approvals").insert(row).select("id").single();
      if (error || !data) continue;
      approvalIds.push(data.id);
      if (relatedType === "content_idea" && relatedId) {
        await ctx.db.from("content_ideas").update({ status: "CEO_REVIEW" }).eq("id", relatedId).eq("company_id", ctx.company.id);
      }
    }
  }

  // ---- Daily Brief ----
  const thingsToTry: ThingToTry[] = summary
    ? summary.things_to_try.slice(0, 3).map((t) => {
        const i = validIndex(t.trend_index, vibeTrends.length);
        return { title: t.title, why: t.why, how: t.how, trend_id: i !== null ? vibeTrends[i].id : null };
      })
    : vibeTrends
        .filter((t) => t.try_worthy)
        .slice(0, 3)
        .map((t) => ({ title: t.name, why: t.try_reason ?? "개발자가 직접 써볼 가치가 있음", how: "공식 문서/릴리스 노트를 보고 작은 사이드 프로젝트에 적용해본다.", trend_id: t.id }));

  const toItem = (id: string, title: string, s: string | null, score: number): BriefItem => ({ id, title, summary: truncate(s, 300), score });
  const briefTitle = summary?.title ? `${ctx.today} ${summary.title}` : `${ctx.today} ${ctx.company.name} Daily Brief`;
  const executiveSummary =
    summary?.executive_summary ??
    `오늘 검증된 트렌드 ${trends.length}개, 사업 기회 ${topOpps.length}개, 콘텐츠 아이디어 ${topContents.length}개가 정리되었습니다.` +
      (aiTrends[0] ? ` 가장 중요한 이슈는 "${aiTrends[0].name}" 입니다.` : "");

  const { data: brief, error: briefErr } = await ctx.db
    .from("daily_briefs")
    .upsert(
      {
        company_id: ctx.company.id,
        run_id: ctx.run.id,
        brief_date: ctx.today,
        title: briefTitle.slice(0, 200),
        executive_summary: executiveSummary,
        ai_trends: toJson(aiTrends.map((t) => toItem(t.id, t.name, t.summary, t.current_score))),
        vibe_coding: toJson(vibeTrends.map((t) => toItem(t.id, t.name, t.summary, t.current_score))),
        opportunities: toJson(topOpps.map((o) => toItem(o.id, o.title, o.problem, o.opportunity_score))),
        content_ideas: toJson(topContents.map((c) => toItem(c.id, `[${c.platform}] ${c.title}`, c.hook, c.total_score))),
        things_to_try: toJson(thingsToTry),
        competitor_movement: toJson(competitorMovement),
        important_decisions: toJson(summary?.important_decisions ?? (execMinutes?.decision ? [execMinutes.decision] : [])),
        approval_ids: approvalIds,
      },
      { onConflict: "company_id,brief_date" },
    )
    .select("id")
    .single();
  if (briefErr || !brief) throw new Error(`Daily Brief 저장 실패: ${briefErr?.message}`);

  if (taskId && summary) {
    await ctx.db.from("task_results").insert({
      company_id: ctx.company.id,
      task_id: taskId,
      employee_id: exec?.id ?? null,
      stage: "summary",
      output: summary,
      summary: summary.executive_summary,
      review_status: "passed",
      model: exec?.model ?? null,
    });
    await updateTask(ctx.db, ctx.company.id, taskId, { status: approvalIds.length ? "APPROVAL" : "DONE", completed_at: new Date().toISOString() });
  }

  // ---- Notion Sync Queue (AI Workflow 는 Notion 을 직접 호출하지 않는다) ----
  const { data: meetings } = await ctx.db.from("meetings").select("id").eq("company_id", ctx.company.id).eq("run_id", ctx.run.id);
  const queue: { entityType: NotionEntityType; entityId: string }[] = [
    { entityType: "daily_brief", entityId: brief.id },
    ...trends.map((t) => ({ entityType: "trend" as const, entityId: t.id })),
    ...topOpps.map((o) => ({ entityType: "opportunity" as const, entityId: o.id })),
    ...topContents.map((c) => ({ entityType: "content_idea" as const, entityId: c.id })),
    ...(meetings ?? []).map((m) => ({ entityType: "meeting" as const, entityId: m.id })),
  ];
  await enqueueNotionSync(ctx.db, ctx.company.id, queue);

  // ---- 직원 평가 갱신 ----
  for (const e of ctx.employees) await recomputeEmployeePerformance(ctx.db, ctx.company.id, e.id, ctx.today);
  if (exec) await exec.setStatus(approvalIds.length ? "approving" : "working");

  ctx.log(`📨 CEO Report: Daily Brief 생성, 결재 안건 ${approvalIds.length}건, Notion 대기열 ${queue.length}건`);
}
