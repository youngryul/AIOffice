/**
 * 워크플로 통합 테스트 — 로컬 Supabase(`supabase start`) 필요.
 * OpenAI 호출만 스키마에 맞는 가짜 응답으로 대체하고, 7단계 업무 사이클의
 * DB 로직(업무 생성 → 리서치 → 팩트체크 → 트렌드 → 사업기회 → 콘텐츠 → 회의 → Brief/결재 → Notion Queue)을 끝까지 실행한다.
 *
 *   npm run test:integration
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

// .env.local 로드 (로컬 Supabase 키)
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
process.env.OPENAI_API_KEY = "test-key-not-used";

const SRC = "https://example.com/news/agent-sdk";

vi.mock("@/lib/ai/structured", () => {
  const outputs: Record<string, unknown> = {
    morning_plan: {
      focus_summary: "AI Agent 와 코딩 도구 업데이트에 집중",
      agenda: ["리서치", "분석", "콘텐츠"],
      assignments: [0, 1, 2, 3, 99].map((i) => ({
        employee_index: i,
        title: `업무 ${i}`,
        description: "설명",
        priority: "high",
        keywords: ["AI agent", "Claude Code"],
        reason: "CEO 관심사",
      })),
    },
    research_output: {
      summary: "요약",
      findings: [
        { title: "New Agent SDK released", summary: "SDK 공개", category: "ai_trend", source_urls: [SRC], published_date: "2026-10-05", importance: 90, novelty: 80, practical_value: 70, business_potential: 75, sns_potential: 85, developer_impact: 90, developer_try_worthy: true, try_reason: "바로 써볼 수 있음", is_speculation: false },
        { title: "Rumor without source", summary: "루머", category: "ai_trend", source_urls: [], published_date: null, importance: 60, novelty: 60, practical_value: 10, business_potential: 10, sns_potential: 10, developer_impact: 10, developer_try_worthy: false, try_reason: null, is_speculation: true },
      ],
      sources: [{ title: "Agent SDK", url: `${SRC}?utm_source=x`, publisher: "Example", published_at: "2026-10-05", source_type: "news" }],
      insights: ["해석"],
      recommendations: ["써보기"],
      confidence: 80,
      next_actions: [],
    },
    team_review: {
      summary: "검토 완료",
      reviews: [0, 1, 2, 3].map((i) => ({ finding_index: i, verdict: "pass", issues: ["none"], notes: "ok", duplicate_of_index: null, trend_name: "AI Agent SDK", adjusted_importance: 88 })),
    },
    business_analysis: {
      summary: "분석",
      market_questions: { pain_points: "a", willingness_to_pay: "b", existing_problems: "c", simpler_solution: "d" },
      opportunities: [{ trend_index: 0, title: "Agent 템플릿 마켓", trend: "AI Agent SDK", problem: "p", target_user: "dev", opportunity: "o", product_idea: "i", solution: "s", market: "m", revenue_model: "구독", competition: "c", difficulty: "medium", development_time: "4주", potential_score: 150 }],
      competitor_movements: [{ name: "OpenAI", movement: "SDK 출시", implication: "생태계 확장" }],
      insights: [],
      confidence: 70,
    },
    content_factory: {
      summary: "콘텐츠",
      ideas: ["instagram", "threads", "blog", "reels"].map((platform) => ({
        trend_index: 0, trend: "AI Agent SDK", angle: "개발자 관점", platform, content_type: "post", title: `${platform} 아이디어`, hook: "hook",
        carousel_title: null, slides: platform === "instagram" ? ["1", "2", "3", "4", "5"] : [], caption: "cap", cta: "cta", hashtags: ["#ai"],
        image_prompt: null, reels_hook: null, reels_script: null, outline: [],
        scores: { trend: 18, originality: 30, audience_fit: 15, save_potential: 14, share_potential: 12, brand_fit: 19 },
      })),
    },
    meeting_turn: { opinion: "의견", key_points: ["포인트"], responses: [{ participant_index: 0, stance: "agree", comment: "동의" }] },
    meeting_minutes: { discussion: "토론", arguments: [{ participant_index: 0, argument: "근거" }], consensus: "합의", disagreements: [], decision: "결정", action_items: [{ owner_index: 0, item: "실행" }], ceo_approval_required: true },
    executive_summary: {
      title: "AI Agent 의 날",
      executive_summary: "요약",
      things_to_try: [{ trend_index: 0, title: "SDK 써보기", why: "w", how: "h" }],
      approvals: [
        { title: "사업 검증", type: "opportunity", ref_kind: "opportunity", ref_index: 0, summary: "s", reason: "r", impact: "i", recommendation: "rec", alternatives: ["보류"], cost: "1주" },
        { title: "콘텐츠 발행", type: "content", ref_kind: "content", ref_index: 0, summary: "s", reason: "r", impact: "i", recommendation: "rec", alternatives: [], cost: "0" },
        { title: "잘못된 참조", type: "other", ref_kind: "trend", ref_index: 42, summary: "s", reason: "r", impact: "i", recommendation: "rec", alternatives: [], cost: "0" },
      ],
      important_decisions: ["결정"],
    },
  };
  return {
    AI_MAX_RETRIES: 2,
    openai: () => {
      throw new Error("not used");
    },
    embedTexts: async () => null,
    callStructured: async ({ schemaName, schema }: { schemaName: string; schema: { parse: (v: unknown) => unknown } }) => {
      if (!(schemaName in outputs)) throw new Error(`no mock for ${schemaName}`);
      return { output: schema.parse(outputs[schemaName]), retrievedUrls: [SRC], costUsd: 0 };
    },
  };
});

const { createAdminClient } = await import("@/lib/supabase/admin");
const { createCompanyForUser } = await import("@/lib/services/onboarding");
const { startRun, advanceRun } = await import("@/lib/agents/workflow/engine");
const { decideApproval } = await import("@/lib/services/approvals");
const { processNotionQueue } = await import("@/lib/notion/sync");

const db = createAdminClient();
let userId = "";
let companyId = "";

beforeAll(async () => {
  const { data, error } = await db.auth.admin.createUser({ email: `wf-${Date.now()}@test.local`, password: "integration-test-pass", email_confirm: true });
  if (error || !data.user) throw error;
  userId = data.user.id;
  companyId = await createCompanyForUser(db, userId, {
    companyName: "Integration Co",
    interests: ["AI"],
    brandTopics: ["바이브코딩"],
    brandDirection: "",
    timezone: "Asia/Seoul",
    workStart: "09:00",
    workEnd: "17:00",
    roles: ["chief_of_staff", "ai_trend_researcher", "vibe_coding_researcher", "business_analyst", "content_strategist"],
    withDemo: false,
  });
  // Notion 이 연결된 회사처럼 만들어 Queue 적재까지 확인
  await db.from("notion_connections").insert({ company_id: companyId, auth_type: "env", status: "connected" });
});

afterAll(async () => {
  if (userId) await db.auth.admin.deleteUser(userId); // cascade 로 회사 데이터 삭제
});

describe("FAST MODE workday cycle", () => {
  it("runs all 7 stages and produces brief, approvals, trends, opportunities, content and notion jobs", async () => {
    let run = await startRun(db, companyId, "FAST");
    const stages: string[] = [];
    for (let i = 0; i < 12 && run.status === "running"; i++) {
      const res = await advanceRun(db, companyId, run.id);
      run = res.run;
      stages.push(`${run.stage}:${run.status}${run.error ? `:${run.error}` : ""}`);
    }
    expect(run.error, stages.join(" | ")).toBeNull();
    expect(run.status).toBe("completed");

    const count = async (table: "tasks" | "trends" | "opportunities" | "content_ideas" | "meetings" | "approvals" | "daily_briefs" | "notion_sync_queue" | "sources" | "meeting_messages") =>
      (await db.from(table).select("*", { count: "exact", head: true }).eq("company_id", companyId)).count ?? 0;

    expect(await count("tasks")).toBeGreaterThanOrEqual(4);
    expect(await count("sources")).toBe(1); // 같은 URL 은 1개로 정규화
    const { data: trends } = await db.from("trends").select("*").eq("company_id", companyId);
    expect(trends).toHaveLength(1); // 출처 없는 루머는 탈락, 같은 이슈는 하나로 묶임
    expect(trends![0]).toMatchObject({ name: "AI Agent SDK", fact_check_status: "verified", try_worthy: true });
    expect(trends![0].mention_count).toBeGreaterThanOrEqual(2);

    const { data: opps } = await db.from("opportunities").select("opportunity_score").eq("company_id", companyId);
    expect(opps![0].opportunity_score).toBe(100); // clamp
    const { data: contents } = await db.from("content_ideas").select("total_score, score_originality, status").eq("company_id", companyId);
    expect(contents).toHaveLength(4);
    expect(contents!.every((c) => c.score_originality <= 20)).toBe(true);
    expect(contents!.some((c) => c.status === "CEO_REVIEW")).toBe(true);

    expect(await count("meetings")).toBe(2); // morning + executive
    expect(await count("meeting_messages")).toBeGreaterThan(4);
    expect(await count("approvals")).toBe(3);
    const { data: brief } = await db.from("daily_briefs").select("*").eq("company_id", companyId).single();
    expect((brief!.things_to_try as unknown[]).length).toBe(1);
    expect(brief!.approval_ids).toHaveLength(3);
    expect(await count("notion_sync_queue")).toBeGreaterThanOrEqual(5);

    const { data: emps } = await db.from("employees").select("status").eq("company_id", companyId);
    expect(emps!.every((e) => e.status === "offline")).toBe(true); // 퇴근

    // 같은 Run 은 두 번 진행되지 않는다
    const again = await advanceRun(db, companyId, run.id);
    expect(again.advanced).toBe(false);
  }, 120_000);

  it("CEO approval → execution, memory and follow-up task", async () => {
    const { data: approvals } = await db.from("approvals").select("*").eq("company_id", companyId).order("created_at");
    const opp = approvals!.find((a) => a.related_entity_type === "opportunity")!;
    await decideApproval(db, { companyId, approvalId: opp.id, decision: "APPROVED", tags: ["사업 아이디어로 좋음"], note: null });
    const { data: o } = await db.from("opportunities").select("status").eq("id", opp.related_entity_id!).single();
    expect(o!.status).toBe("RESEARCHING");

    const other = approvals!.find((a) => a.related_entity_type === null)!;
    await decideApproval(db, { companyId, approvalId: other.id, decision: "MORE_RESEARCH", tags: [], note: "경쟁사도 조사" });
    const { data: follow } = await db.from("tasks").select("*").eq("company_id", companyId).eq("source", "approval_followup");
    expect(follow).toHaveLength(1);
    expect(follow![0].run_id).toBeNull(); // 다음 Morning Meeting 에서 편입

    const { count } = await db.from("company_memory").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("source", "feedback");
    expect(count).toBe(2);
  });

  it("Notion sync failure is retried with backoff, then marked FAILED after 3 attempts", async () => {
    delete process.env.NOTION_TOKEN; // env 방식 연결이지만 토큰이 없다 → 실패해야 한다
    const first = await processNotionQueue(db, { companyId, limit: 100 });
    expect(first.processed).toBeGreaterThan(0);
    expect(first.retried).toBe(first.processed);
    const { data: jobs } = await db.from("notion_sync_queue").select("status, retry_count, error, next_attempt_at").eq("company_id", companyId);
    expect(jobs!.every((j) => j.status === "PENDING" && j.retry_count === 1 && j.error)).toBe(true);
    expect(jobs!.every((j) => new Date(j.next_attempt_at) > new Date())).toBe(true);

    // 재시도 시간을 앞당겨 2번 더 실패시키면 FAILED
    for (let i = 0; i < 2; i++) {
      await db.from("notion_sync_queue").update({ next_attempt_at: new Date(0).toISOString() }).eq("company_id", companyId).eq("status", "PENDING");
      await processNotionQueue(db, { companyId, limit: 100 });
    }
    const { data: after } = await db.from("notion_sync_queue").select("status, retry_count").eq("company_id", companyId);
    expect(after!.every((j) => j.status === "FAILED" && j.retry_count === 3)).toBe(true);
  });

  it("rejects advancing another company's run", async () => {
    const { data: run } = await db.from("workday_runs").select("id").eq("company_id", companyId).single();
    await expect(advanceRun(db, "00000000-0000-0000-0000-000000000000", run!.id)).rejects.toThrow();
  });
});
