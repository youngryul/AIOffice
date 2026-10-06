import "server-only";
import type { WorkflowContext } from "../context";
import { truncate } from "../helpers";
import { runMeeting, type MeetingParticipant } from "../meeting";

interface ResultSummaryShape {
  summary?: string;
  findings?: { title: string }[];
  opportunities?: { title: string; potential_score: number }[];
  ideas?: { title: string; platform: string }[];
  insights?: string[];
}

/** Executive Meeting: 오늘 업무를 한 직원들이 결과를 근거로 토론한다 (최대 2~3 Round) */
export async function executiveMeetingStage(ctx: WorkflowContext) {
  const coordinator = ctx.executive();
  if (!coordinator) {
    ctx.log("회의를 진행할 Coordinator(Executive)가 없어 회의를 건너뜁니다.");
    return;
  }

  const { data: results } = await ctx.db
    .from("task_results")
    .select("employee_id, stage, summary, output, review_status, tasks!inner(run_id)")
    .eq("company_id", ctx.company.id)
    .eq("tasks.run_id", ctx.run.id)
    .neq("stage", "review")
    .order("created_at", { ascending: false });

  const byEmployee = new Map<string, string[]>();
  for (const r of results ?? []) {
    if (!r.employee_id || r.employee_id === coordinator.id) continue;
    const out = r.output as ResultSummaryShape;
    const lines = [`(${r.stage}${r.stage === "research" ? `, 검토: ${r.review_status}` : ""}) ${truncate(r.summary ?? out.summary, 400)}`];
    if (out.findings?.length) lines.push(`주요 Finding: ${out.findings.slice(0, 5).map((f) => f.title).join(" / ")}`);
    if (out.opportunities?.length) lines.push(`사업 기회: ${out.opportunities.map((o) => `${o.title}(${o.potential_score})`).join(" / ")}`);
    if (out.ideas?.length) lines.push(`콘텐츠: ${out.ideas.slice(0, 6).map((i) => `[${i.platform}] ${i.title}`).join(" / ")}`);
    if (out.insights?.length) lines.push(`인사이트: ${out.insights.slice(0, 3).join(" / ")}`);
    byEmployee.set(r.employee_id, [...(byEmployee.get(r.employee_id) ?? []), ...lines]);
  }

  const participants: MeetingParticipant[] = ctx.employees
    .filter((e) => byEmployee.has(e.id))
    .map((agent) => ({ agent, myWork: byEmployee.get(agent.id)!.join("\n") }));
  if (!participants.length) {
    ctx.log("오늘 결과를 낸 직원이 없어 회의를 건너뜁니다.");
    return;
  }

  const { minutes } = await runMeeting(ctx, {
    type: "executive",
    topic: `${ctx.today} Executive Meeting — 오늘의 핵심 트렌드와 사업/콘텐츠 우선순위`,
    coordinator,
    participants,
    rounds: 2,
  });
  ctx.log(`💬 Executive Meeting: 참가자 ${participants.length + 1}명, 결정 — ${truncate(minutes?.decision, 120) || "(없음)"}`);
}
