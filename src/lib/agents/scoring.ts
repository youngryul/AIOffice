/**
 * 점수 계산 (순수 함수 — 단위 테스트 대상).
 */

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export const score100 = (v: number) => clamp(v, 0, 100);
export const score20 = (v: number) => clamp(v, 0, 20);

/**
 * Trend Score (총 100점)
 * Novelty 25% · Growth 25% · Business Potential 20% · Developer Impact 15% · Content Potential 15%
 */
export const TREND_WEIGHTS = {
  novelty: 0.25,
  growth: 0.25,
  business: 0.2,
  developer: 0.15,
  content: 0.15,
} as const;

export interface TrendScoreInput {
  novelty: number;
  growth: number;
  business: number;
  developer: number;
  content: number;
}

export function trendScore(input: TrendScoreInput): number {
  return score100(
    score100(input.novelty) * TREND_WEIGHTS.novelty +
      score100(input.growth) * TREND_WEIGHTS.growth +
      score100(input.business) * TREND_WEIGHTS.business +
      score100(input.developer) * TREND_WEIGHTS.developer +
      score100(input.content) * TREND_WEIGHTS.content,
  );
}

/**
 * Growth Score: 언급 횟수 증가와 최근성으로 계산.
 * 처음 등장한 트렌드는 언급량 기반, 기존 트렌드는 직전 대비 증가율 반영.
 */
export function growthScore(params: { mentionCount: number; previousMentionCount: number; importance: number }): number {
  const { mentionCount, previousMentionCount, importance } = params;
  const delta = Math.max(0, mentionCount - previousMentionCount);
  const momentum = previousMentionCount === 0 ? Math.min(60, mentionCount * 20) : Math.min(60, (delta / previousMentionCount) * 60);
  return score100(momentum + importance * 0.4);
}

/**
 * Content Score: Trend · Originality · Audience Fit · Save · Share · Brand Fit 각 20점.
 * 6개 항목 × 20점 = 120점 만점을 100점으로 정규화한다.
 */
export interface ContentScoreInput {
  trend: number;
  originality: number;
  audience_fit: number;
  save_potential: number;
  share_potential: number;
  brand_fit: number;
}

export function contentScore(input: ContentScoreInput): number {
  const sum =
    score20(input.trend) +
    score20(input.originality) +
    score20(input.audience_fit) +
    score20(input.save_potential) +
    score20(input.share_potential) +
    score20(input.brand_fit);
  return score100((sum / 120) * 100);
}

/** 직원 종합 성과 (0~100) */
export interface PerformanceInput {
  accuracy: number;
  approvalRate: number;
  usefulInsight: number;
  originality: number;
  taskCompletion: number;
  contentPerformance: number;
}

export function overallPerformance(p: PerformanceInput): number {
  return score100(
    p.accuracy * 0.25 +
      p.approvalRate * 0.2 +
      p.usefulInsight * 0.2 +
      p.originality * 0.1 +
      p.taskCompletion * 0.15 +
      p.contentPerformance * 0.1,
  );
}

/** 승진 후보 기준 */
export const PROMOTION_RULES = {
  minOverall: 75,
  minApprovalRate: 60,
  minAccuracy: 70,
  minCompletedTasks: 5,
} as const;

export function isPromotionCandidate(params: {
  overall: number;
  approvalRate: number;
  accuracy: number;
  completedTasks: number;
  level: number;
}): boolean {
  return (
    params.level < 6 &&
    params.overall >= PROMOTION_RULES.minOverall &&
    params.approvalRate >= PROMOTION_RULES.minApprovalRate &&
    params.accuracy >= PROMOTION_RULES.minAccuracy &&
    params.completedTasks >= PROMOTION_RULES.minCompletedTasks
  );
}
