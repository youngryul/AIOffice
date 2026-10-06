import "server-only";
import type { Json, TablesInsert } from "@/lib/supabase/database.types";
import { ROLE_CATALOG } from "@/lib/agents/roles";
import { MorningPlanSchema, type MorningPlan } from "@/lib/agents/schemas";
import { morningMeetingPrompt } from "@/lib/agents/prompts/tasks";
import { formatTrends, recentTrends } from "@/lib/tools/trendSearch";
import { activeProjects, formatProjects } from "@/lib/tools/projectContext";
import type { AgentEmployee } from "@/lib/agents/agent";
import type { WorkflowContext } from "../context";
import { createMeeting, taskTypeForRole, validIndex } from "../helpers";

/** 비서실장이 없거나 일부 직원이 빠졌을 때 쓰는 기본 업무 */
function defaultAssignment(e: AgentEmployee, keywords: string[]) {
  const role = ROLE_CATALOG[e.role];
  const base = keywords.length ? keywords : e.row.specialty.slice(0, 5);
  switch (e.role) {
    case "ai_trend_researcher":
      return { title: "오늘의 AI 업계 주요 뉴스 조사", description: "주요 AI 기업과 스타트업의 최근 7일 발표를 조사한다.", keywords: ["AI news this week", ...base].slice(0, 6) };
    case "vibe_coding_researcher":
      return { title: "AI 코딩 도구 업데이트 조사", description: "Cursor / Claude Code / Codex / MCP 관련 최근 업데이트와 써볼 만한 기능을 조사한다.", keywords: ["Cursor update", "Claude Code", "Codex", "MCP server", ...base].slice(0, 6) };
    case "market_researcher":
      return { title: "새로운 AI SaaS 조사", description: "최근 출시된 AI SaaS 와 사용자 반응, Pain Point 를 조사한다.", keywords: ["new AI SaaS launch", "Product Hunt AI", ...base].slice(0, 6) };
    case "business_analyst":
      return { title: "오늘 리서치 기반 사업 기회 분석", description: "검증된 트렌드에서 사업 기회를 찾고 평가한다.", keywords: [] };
    case "content_strategist":
      return { title: "오늘 주요 트렌드 기반 콘텐츠 기획", description: "트렌드를 Instagram / Threads / Blog / Reels 콘텐츠로 변환한다.", keywords: [] };
    case "brand_strategist":
      return { title: "브랜드 포지셔닝 점검", description: "오늘 트렌드가 브랜드 방향과 맞는지 점검한다.", keywords: [] };
    case "fact_checker":
      return { title: "리서치 결과 팩트체크", description: "리서처 Finding 의 출처/날짜/수치를 검증한다.", keywords: [] };
    default:
      return { title: `${role.title} 정기 업무`, description: role.description, keywords: [] };
  }
}

export async function morningMeetingStage(ctx: WorkflowContext) {
  const cos = ctx.byRole("chief_of_staff");
  const workers = ctx.employees.filter((e) => e.role !== "chief_of_staff");
  if (!workers.length) throw new Error("업무를 수행할 직원이 없습니다. 직원을 먼저 채용하세요.");

  await Promise.all(ctx.employees.map((e) => e.setStatus("meeting")));

  const [trends, projects, followupsRes] = await Promise.all([
    recentTrends(ctx.db, ctx.company.id, { days: 3, limit: 10 }),
    activeProjects(ctx.db, ctx.company.id),
    // CEO 가 지시한 추가 조사(아직 Run 에 배정되지 않은 Task)를 오늘 Run 에 편입
    ctx.db
      .from("tasks")
      .select("*")
      .eq("company_id", ctx.company.id)
      .is("run_id", null)
      .eq("status", "TODO")
      .order("created_at")
      .limit(10),
  ]);
  const followups = followupsRes.data ?? [];
  if (followups.length) {
    await ctx.db
      .from("tasks")
      .update({ run_id: ctx.run.id })
      .in("id", followups.map((t) => t.id))
      .eq("company_id", ctx.company.id);
  }

  let plan: MorningPlan | null = null;
  if (cos) {
    await cos.setStatus("meeting");
    const result = await cos.run({
      purpose: "morning_meeting",
      schema: MorningPlanSchema,
      schemaName: "morning_plan",
      include: ["company", "ceoPreferences", "memory", "records"],
      taskPrompt: morningMeetingPrompt({
        employeesList: workers
          .map((e, i) => `[${i}] ${e.name} — ${ROLE_CATALOG[e.role].title} (${e.position}). 전문: ${e.row.specialty.join(", ")}${e.row.interests.length ? ` / CEO 지정 관심: ${e.row.interests.join(", ")}` : ""}`)
          .join("\n"),
        yesterdayTrends: formatTrends(trends),
        pendingFollowups: followups.length ? followups.map((t) => `- ${t.title}`).join("\n") : "(없음)",
        projects: formatProjects(projects.filter((p) => p.auto_research)),
      }),
    });
    plan = result.output;
  }

  // 계획 검증: 잘못된 index 는 버리고, 업무가 없는 직원에게는 기본 업무를 준다.
  const assigned = new Map<string, { title: string; description: string; priority: TablesInsert<"tasks">["priority"]; keywords: string[] }>();
  for (const a of plan?.assignments ?? []) {
    const idx = validIndex(a.employee_index, workers.length);
    if (idx === null) continue;
    const emp = workers[idx];
    if (assigned.has(emp.id)) continue;
    assigned.set(emp.id, { title: a.title, description: `${a.description}\n\n(배정 이유: ${a.reason})`, priority: a.priority, keywords: a.keywords });
  }
  const companyKeywords = ctx.company.researchKeywords;
  for (const e of workers) {
    if (!assigned.has(e.id)) {
      const d = defaultAssignment(e, [...e.row.interests, ...companyKeywords].slice(0, 4));
      assigned.set(e.id, { ...d, priority: "medium" });
    }
  }

  const rows: TablesInsert<"tasks">[] = workers.map((e) => {
    const a = assigned.get(e.id)!;
    return {
      company_id: ctx.company.id,
      run_id: ctx.run.id,
      title: a.title.slice(0, 200),
      description: a.description,
      department: e.row.department,
      task_type: taskTypeForRole(e.role),
      assigned_employee: e.id,
      priority: a.priority,
      keywords: a.keywords.slice(0, 8),
      created_by: cos ? "chief_of_staff" : "system",
      source: "morning_meeting",
    };
  });
  const { error: taskErr } = await ctx.db.from("tasks").insert(rows);
  if (taskErr) throw new Error(`오늘 업무 생성 실패: ${taskErr.message}`);

  // 회의 기록 (Morning Meeting)
  const meeting = await createMeeting(ctx, {
    type: "morning",
    topic: `${ctx.today} Morning Meeting`,
    coordinatorId: cos?.id ?? null,
    participantIds: ctx.employees.map((e) => e.id),
  });
  const messages: TablesInsert<"meeting_messages">[] = [];
  if (plan) {
    messages.push({ meeting_id: meeting.id, company_id: ctx.company.id, employee_id: cos?.id ?? null, round: 1, stance: "opinion", content: plan.focus_summary });
  }
  for (const e of workers) {
    const a = assigned.get(e.id)!;
    messages.push({
      meeting_id: meeting.id,
      company_id: ctx.company.id,
      employee_id: cos?.id ?? null,
      round: 1,
      stance: "summary",
      content: `${e.name}: ${a.title}${a.keywords.length ? ` (키워드: ${a.keywords.join(", ")})` : ""}`,
    });
  }
  if (messages.length) await ctx.db.from("meeting_messages").insert(messages);
  await ctx.db.from("meeting_minutes").insert({
    meeting_id: meeting.id,
    company_id: ctx.company.id,
    topic: meeting.topic,
    participants: ctx.employees.map((e) => e.name) as Json,
    discussion: plan?.focus_summary ?? "비서실장 부재로 기본 업무를 배정했습니다.",
    arguments: [] as Json,
    consensus: (plan?.agenda ?? []).join(" / "),
    disagreements: [] as Json,
    decision: "오늘 업무 배분 확정",
    action_items: workers.map((e) => ({ owner: e.name, item: assigned.get(e.id)!.title })) as Json,
    ceo_approval_required: false,
  });
  await ctx.db.from("meetings").update({ status: "completed", ended_at: new Date().toISOString(), rounds: 1 }).eq("id", meeting.id);

  await ctx.db
    .from("workday_runs")
    .update({ plan: (plan ?? { focus_summary: "기본 업무 배분", agenda: [], assignments: [] }) as unknown as Json })
    .eq("id", ctx.run.id);
  await Promise.all(ctx.employees.map((e) => e.setStatus("working")));
  ctx.log(`📋 Morning Meeting: ${rows.length}개 업무 배정${followups.length ? `, CEO 후속 지시 ${followups.length}건 편입` : ""}`);
}
