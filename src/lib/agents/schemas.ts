import { z } from "zod";

/**
 * AI 직원 출력 스키마 (OpenAI Structured Output).
 *
 * Structured Output strict mode 규칙:
 *  - 모든 필드는 required → 선택값은 `.nullable()` 로 표현한다.
 *  - 범위 제약(min/max)은 모델에 맡기지 않고 저장 전에 코드에서 clamp 한다 (lib/agents/scoring.ts).
 *  - AI 가 DB ID 를 만들어내지 않도록, 다른 항목은 "입력 목록의 index" 로만 참조한다.
 */

const Score = z.number().describe("0~100 사이 정수 점수");

export const SourceSchema = z.object({
  title: z.string(),
  url: z.string().describe("반드시 실제로 확인한 http(s) URL. 모르면 이 출처를 넣지 마라."),
  publisher: z.string().nullable(),
  published_at: z.string().nullable().describe("YYYY-MM-DD. 모르면 null"),
  source_type: z.enum(["news", "blog", "official", "paper", "community", "product", "video", "other"]),
});
export type SourceOutput = z.infer<typeof SourceSchema>;

export const FindingSchema = z.object({
  title: z.string(),
  summary: z.string().describe("사실만 2~4문장. 과장 금지."),
  category: z.enum(["ai_trend", "vibe_coding", "market", "other"]),
  source_urls: z.array(z.string()).describe("이 Finding 을 뒷받침하는 sources[].url 목록"),
  published_date: z.string().nullable(),
  importance: Score,
  novelty: Score,
  practical_value: Score.describe("실무 활용도"),
  business_potential: Score,
  sns_potential: Score.describe("SNS 콘텐츠 가능성"),
  developer_impact: Score,
  developer_try_worthy: z.boolean().describe("개발자가 직접 사용해볼 가치가 있는가"),
  try_reason: z.string().nullable(),
  is_speculation: z.boolean().describe("출처로 직접 확인되지 않은 추측/해석이면 true"),
});
export type FindingOutput = z.infer<typeof FindingSchema>;

/** 모든 직원 업무 결과의 공통 형태 */
export const WorkOutputSchema = z.object({
  summary: z.string(),
  findings: z.array(FindingSchema),
  sources: z.array(SourceSchema),
  insights: z.array(z.string()),
  recommendations: z.array(z.string()),
  confidence: Score,
  next_actions: z.array(z.string()),
});
export type WorkOutput = z.infer<typeof WorkOutputSchema>;

/** Morning Meeting — 비서실장이 오늘 업무를 배분 */
export const MorningPlanSchema = z.object({
  focus_summary: z.string().describe("오늘 회사가 집중할 주제 요약 (2~3문장)"),
  agenda: z.array(z.string()),
  assignments: z.array(
    z.object({
      employee_index: z.number().describe("입력된 직원 목록의 index"),
      title: z.string(),
      description: z.string(),
      priority: z.enum(["low", "medium", "high", "urgent"]),
      keywords: z.array(z.string()).describe("조사 키워드 3~6개"),
      reason: z.string().describe("이 업무를 고른 이유 (CEO 관심사/어제 트렌드/프로젝트와의 연결)"),
    }),
  ),
});
export type MorningPlan = z.infer<typeof MorningPlanSchema>;

/** Team Review — 팩트체크 + 중복 제거 + 트렌드 묶기 */
export const ReviewOutputSchema = z.object({
  summary: z.string(),
  reviews: z.array(
    z.object({
      finding_index: z.number().describe("입력 Finding 목록의 index"),
      verdict: z.enum(["pass", "reject", "revise"]),
      issues: z.array(
        z.enum(["no_source", "stale_date", "exaggeration", "wrong_number", "duplicate", "unsupported_claim", "off_topic", "none"]),
      ),
      notes: z.string(),
      duplicate_of_index: z.number().nullable().describe("다른 Finding 과 같은 뉴스면 그 index"),
      trend_name: z.string().describe("이 Finding 이 속하는 트렌드 이름 (같은 이슈는 같은 이름)"),
      adjusted_importance: Score,
    }),
  ),
});
export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;

/** Business Analyst — 시장 질문 + 사업 기회 */
export const AnalysisOutputSchema = z.object({
  summary: z.string(),
  market_questions: z.object({
    pain_points: z.string().describe("사람들이 무엇을 불편해하고 있는가?"),
    willingness_to_pay: z.string().describe("사람들이 돈을 지불할 가능성이 있는가?"),
    existing_problems: z.string().describe("기존 제품의 문제가 무엇인가?"),
    simpler_solution: z.string().describe("우리가 더 간단하게 만들 수 있는가?"),
  }),
  opportunities: z.array(
    z.object({
      trend_index: z.number().nullable().describe("근거가 된 트렌드 목록의 index"),
      title: z.string(),
      trend: z.string(),
      problem: z.string(),
      target_user: z.string(),
      opportunity: z.string(),
      product_idea: z.string(),
      solution: z.string(),
      market: z.string(),
      revenue_model: z.string(),
      competition: z.string(),
      difficulty: z.enum(["low", "medium", "high"]),
      development_time: z.string(),
      potential_score: Score,
    }),
  ),
  competitor_movements: z.array(z.object({ name: z.string(), movement: z.string(), implication: z.string() })),
  insights: z.array(z.string()),
  confidence: Score,
});
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

const ContentScoreSchema = z.object({
  trend: z.number().describe("0~20"),
  originality: z.number().describe("0~20"),
  audience_fit: z.number().describe("0~20"),
  save_potential: z.number().describe("0~20"),
  share_potential: z.number().describe("0~20"),
  brand_fit: z.number().describe("0~20"),
});

/** Content Strategist — 하나의 트렌드 → 여러 채널 */
export const ContentOutputSchema = z.object({
  summary: z.string(),
  ideas: z.array(
    z.object({
      trend_index: z.number().nullable(),
      trend: z.string(),
      angle: z.string(),
      platform: z.enum(["instagram", "threads", "blog", "reels"]),
      content_type: z.string().describe("carousel, thread, long-form, short-video 등"),
      title: z.string(),
      hook: z.string(),
      carousel_title: z.string().nullable(),
      slides: z.array(z.string()).describe("Instagram 이면 5장, 아니면 빈 배열"),
      caption: z.string().nullable(),
      cta: z.string().nullable(),
      hashtags: z.array(z.string()),
      image_prompt: z.string().nullable(),
      reels_hook: z.string().nullable(),
      reels_script: z.string().nullable(),
      outline: z.array(z.string()).describe("Blog/Threads 의 본문 구성. 없으면 빈 배열"),
      scores: ContentScoreSchema,
    }),
  ),
});
export type ContentOutput = z.infer<typeof ContentOutputSchema>;

/** Meeting — 참가자 1명의 발언 */
export const MeetingTurnSchema = z.object({
  opinion: z.string().describe("자신의 조사/분석 결과에 근거한 의견 (3~5문장)"),
  key_points: z.array(z.string()),
  responses: z.array(
    z.object({
      participant_index: z.number().describe("반응하는 다른 참가자의 index"),
      stance: z.enum(["agree", "disagree", "supplement"]),
      comment: z.string(),
    }),
  ),
});
export type MeetingTurn = z.infer<typeof MeetingTurnSchema>;

/** Meeting — Coordinator 의 회의록 */
export const MeetingMinutesSchema = z.object({
  discussion: z.string(),
  arguments: z.array(z.object({ participant_index: z.number(), argument: z.string() })),
  consensus: z.string(),
  disagreements: z.array(z.string()),
  decision: z.string(),
  action_items: z.array(z.object({ owner_index: z.number().nullable(), item: z.string() })),
  ceo_approval_required: z.boolean(),
});
export type MeetingMinutesOutput = z.infer<typeof MeetingMinutesSchema>;

/** Executive Summary — 비서실장의 CEO 보고 */
export const ExecutiveSummarySchema = z.object({
  title: z.string(),
  executive_summary: z.string().describe("CEO 가 1분 안에 읽을 수 있는 요약 (5문장 이내)"),
  things_to_try: z.array(
    z.object({ trend_index: z.number().nullable(), title: z.string(), why: z.string(), how: z.string() }),
  ),
  approvals: z.array(
    z.object({
      title: z.string(),
      type: z.enum(["research", "opportunity", "content", "strategy", "project", "other"]),
      ref_kind: z.enum(["trend", "opportunity", "content", "none"]),
      ref_index: z.number().nullable(),
      summary: z.string(),
      reason: z.string(),
      impact: z.string(),
      recommendation: z.string(),
      alternatives: z.array(z.string()),
      cost: z.string(),
    }),
  ),
  important_decisions: z.array(z.string()),
});
export type ExecutiveSummaryOutput = z.infer<typeof ExecutiveSummarySchema>;

/** CEO 피드백 → 회사 기억 요약 */
export const MemorySummarySchema = z.object({
  category: z.enum([
    "ceo_preferences",
    "brand_identity",
    "content_strategy",
    "rejected_ideas",
    "approved_ideas",
    "best_content",
    "bad_content",
    "past_decisions",
  ]),
  lesson: z.string().describe("향후 AI 판단에 반영할 한 문장 교훈"),
});
export type MemorySummary = z.infer<typeof MemorySummarySchema>;
