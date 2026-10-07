import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { toJson } from "@/lib/supabase/json";
import { contentScore, trendScore } from "@/lib/agents/scoring";
import { slugify } from "@/lib/agents/dedupe";
import type { BriefItem } from "@/lib/types/domain";

/**
 * Demo Mode — 처음 가입한 사용자가 바로 AI Office 를 체험할 수 있도록 샘플 데이터를 DB 에 만든다.
 * 모든 샘플은 제목에 [샘플] 표시가 붙고, 실제 출처가 없으므로 fact_check_status = unverified 이다.
 * 실제 데이터는 "오늘 업무 실행"(FAST MODE)을 누르면 AI 직원들이 생성한다.
 */
const SAMPLE_TRENDS = [
  { name: "AI Coding Agent 의 확산", category: "vibe_coding", summary: "IDE 안에서 여러 파일을 스스로 수정하고 테스트까지 실행하는 코딩 에이전트가 개발 워크플로의 기본값이 되어가고 있다.", n: 70, g: 80, b: 75, d: 95, c: 85, try: true },
  { name: "MCP 생태계 확장", category: "vibe_coding", summary: "Model Context Protocol 서버가 다양한 SaaS 와 개발 도구에 붙으며 에이전트가 외부 도구를 쓰는 표준 방식으로 자리잡는 중이다.", n: 75, g: 85, b: 70, d: 90, c: 70, try: true },
  { name: "멀티 에이전트 프레임워크", category: "ai_trend", summary: "여러 AI 에이전트가 역할을 나눠 협업하는 프레임워크와 SDK 가 잇따라 공개되고 있다.", n: 80, g: 70, b: 80, d: 75, c: 75, try: false },
  { name: "AI Browser / Computer Use", category: "ai_trend", summary: "AI 가 브라우저와 데스크톱을 직접 조작해 업무를 수행하는 기능이 주요 AI 기업들의 경쟁 포인트가 되었다.", n: 70, g: 75, b: 85, d: 60, c: 80, try: false },
  { name: "Local LLM 성능 향상", category: "ai_trend", summary: "노트북에서 돌아가는 오픈 웨이트 모델의 성능이 빠르게 올라가며 프라이버시 중심 AI 도구 수요가 생기고 있다.", n: 60, g: 65, b: 60, d: 80, c: 65, try: true },
] as const;

export async function seedDemoData(db: AdminSupabase, companyId: string, today: string, employeeIds: Record<string, string>) {
  const now = new Date().toISOString();
  const trendRows = SAMPLE_TRENDS.map((t) => ({
    company_id: companyId,
    slug: slugify(`sample-${t.name}`),
    name: `[샘플] ${t.name}`,
    category: t.category,
    summary: t.summary,
    importance: Math.round((t.n + t.b) / 2),
    novelty: t.n,
    growth_score: t.g,
    business_score: t.b,
    developer_score: t.d,
    content_score: t.c,
    current_score: trendScore({ novelty: t.n, growth: t.g, business: t.b, developer: t.d, content: t.c }),
    mention_count: 3,
    practical_value: t.d,
    try_worthy: t.try,
    try_reason: t.try ? "작은 사이드 프로젝트에 바로 적용해볼 수 있다." : null,
    status: "new" as const,
    fact_check_status: "unverified" as const,
    fact_check_notes: "Demo 샘플 데이터 — 실제 출처 없음",
    discovered_by: t.category === "vibe_coding" ? employeeIds.vibe_coding_researcher ?? null : employeeIds.ai_trend_researcher ?? null,
    first_seen_at: now,
    last_seen_at: now,
  }));
  const { data: trends } = await db.from("trends").insert(trendRows).select("id, name, summary, category, current_score");

  // 7일 변화를 보여줄 수 있도록 과거 스냅샷도 만든다
  if (trends?.length) {
    const snapshots = trends.flatMap((t, i) =>
      [7, 3, 0].map((daysAgo) => {
        const d = new Date(`${today}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() - daysAgo);
        const delta = daysAgo * (2 + i);
        return {
          company_id: companyId,
          trend_id: t.id,
          snapshot_date: d.toISOString().slice(0, 10),
          current_score: Math.max(0, t.current_score - delta),
          growth_score: 60,
          mention_count: Math.max(1, 3 - Math.floor(daysAgo / 3)),
        };
      }),
    );
    await db.from("trend_snapshots").insert(snapshots);
  }

  const { data: opp } = await db
    .from("opportunities")
    .insert({
      company_id: companyId,
      trend_id: trends?.[0]?.id ?? null,
      title: "[샘플] AI 개발도구 비교 서비스",
      trend: "AI Coding Agent 의 확산",
      problem: "Cursor / Claude Code / Codex 등 도구가 너무 빠르게 바뀌어 개발자가 무엇을 써야 할지 판단하기 어렵다.",
      solution: "실제 과제 기반 벤치마크와 사용 후기를 매주 업데이트하는 비교 서비스",
      target_user: "AI 도구를 업무에 도입하려는 개발자와 개발팀 리드",
      market: "AI 개발도구 사용자 (글로벌)",
      competition: "개인 블로그 리뷰, 커뮤니티 스레드 — 체계적인 비교는 부족",
      business_model: "무료 비교 + 팀용 유료 리포트 / 제휴",
      product_idea: "과제별 점수표와 워크플로 템플릿을 제공하는 웹 서비스",
      difficulty: "medium",
      development_time: "4주",
      opportunity_score: 87,
      created_by: employeeIds.business_analyst ?? null,
    })
    .select("id, title, problem, opportunity_score")
    .single();

  const scores = { trend: 18, originality: 15, audience_fit: 18, save_potential: 17, share_potential: 16, brand_fit: 19 };
  const contentRows = [
    { title: "[샘플] 개발자가 오늘 알아야 할 AI 5가지", platform: "instagram", hook: "요즘 개발자는 코딩을 직접 하지 않는다?" },
    { title: "[샘플] AI Coding Agent 를 써보고 느낀 5가지", platform: "threads", hook: "한 달 동안 코딩 에이전트에게 일을 맡겨봤다" },
    { title: "[샘플] Cursor vs Claude Code vs Codex", platform: "blog", hook: "같은 과제를 세 도구에 맡겨봤다" },
    { title: "[샘플] 30초 만에 보는 AI Coding Agent 변화", platform: "reels", hook: "30초면 충분합니다" },
  ] as const;
  const { data: contents } = await db
    .from("content_ideas")
    .insert(
      contentRows.map((c) => ({
        company_id: companyId,
        trend_id: trends?.[0]?.id ?? null,
        title: c.title,
        trend: "AI Coding Agent 의 확산",
        angle: "개발자의 일하는 방식이 바뀌고 있다",
        platform: c.platform,
        content_type: c.platform === "instagram" ? "carousel" : c.platform === "reels" ? "short-video" : "post",
        hook: c.hook,
        body: toJson({
          carousel_title: c.platform === "instagram" ? "요즘 개발자의 하루" : null,
          slides: c.platform === "instagram" ? ["코딩 에이전트가 하는 일", "사람이 하는 일", "바뀐 워크플로", "주의할 점", "오늘 해볼 것"] : [],
          caption: "AI 가 바꾸는 개발자의 하루, 저장해두고 하나씩 따라해보세요.",
          cta: "저장하고 팔로우",
          hashtags: ["#바이브코딩", "#AI개발", "#ClaudeCode", "#Cursor", "#개발자"],
          image_prompt: "minimal flat illustration of a developer working with a friendly AI robot",
          reels_hook: c.platform === "reels" ? "30초면 충분합니다" : null,
          reels_script: c.platform === "reels" ? "1) 문제 2) 에이전트 시연 3) 결과 4) CTA" : null,
          outline: c.platform === "blog" || c.platform === "threads" ? ["도입", "비교 기준", "결과", "추천"] : [],
        }),
        score_trend: scores.trend,
        score_originality: scores.originality,
        score_audience_fit: scores.audience_fit,
        score_save: scores.save_potential,
        score_share: scores.share_potential,
        score_brand_fit: scores.brand_fit,
        total_score: contentScore(scores),
        priority: "high" as const,
        created_by: employeeIds.content_strategist ?? null,
      })),
    )
    .select("id, title, hook, total_score, platform");

  const { data: approval } = await db
    .from("approvals")
    .insert({
      company_id: companyId,
      title: "[샘플] AI 개발도구 비교 서비스 검증 착수",
      type: "opportunity",
      summary: "Opportunity Score 87. 4주 MVP 로 검증 가능한 아이디어입니다.",
      reason: "코딩 에이전트 도구 선택에 대한 개발자 수요가 크고, 체계적인 비교 서비스가 없습니다.",
      impact: "브랜드(바이브코딩)와 직접 연결되며 콘텐츠로도 재활용 가능",
      recommendation: "랜딩 페이지 + 3개 도구 비교 리포트로 1주 검증",
      alternatives: toJson(["콘텐츠 시리즈로만 먼저 검증", "보류"]),
      cost: "1주 / 약 $5 AI 비용",
      employee_id: employeeIds.business_analyst ?? employeeIds.chief_of_staff ?? null,
      related_entity_type: opp ? "opportunity" : null,
      related_entity_id: opp?.id ?? null,
    })
    .select("id")
    .single();

  const item = (id: string, title: string, summary: string | null, score: number): BriefItem => ({ id, title, summary: summary ?? "", score });
  const ai = (trends ?? []).filter((t) => t.category !== "vibe_coding");
  const vibe = (trends ?? []).filter((t) => t.category === "vibe_coding");
  await db.from("daily_briefs").insert({
    company_id: companyId,
    brief_date: today,
    title: `${today} AI Office Daily Brief (샘플)`,
    executive_summary:
      "샘플 Brief 입니다. 상단의 '오늘 업무 실행' 버튼을 누르면 AI 직원들이 실제로 웹을 조사하고, 팩트체크와 회의를 거쳐 오늘의 Brief 를 새로 작성합니다.",
    ai_trends: toJson(ai.map((t) => item(t.id, t.name, t.summary, t.current_score))),
    vibe_coding: toJson(vibe.map((t) => item(t.id, t.name, t.summary, t.current_score))),
    opportunities: toJson(opp ? [item(opp.id, opp.title, opp.problem, opp.opportunity_score)] : []),
    content_ideas: toJson((contents ?? []).map((c) => item(c.id, `[${c.platform}] ${c.title}`, c.hook, c.total_score))),
    things_to_try: toJson(
      vibe.map((t) => ({ title: t.name.replace("[샘플] ", ""), why: "개발 생산성에 직접 영향", how: "작은 리팩터링 과제 하나를 맡겨보고 결과를 비교한다", trend_id: t.id })),
    ),
    competitor_movement: toJson([]),
    important_decisions: toJson([]),
    approval_ids: approval ? [approval.id] : [],
  });
}
