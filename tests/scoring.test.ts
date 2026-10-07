import { describe, expect, it } from "vitest";
import { clamp, contentScore, growthScore, isPromotionCandidate, overallPerformance, trendScore } from "@/lib/agents/scoring";

describe("trendScore", () => {
  it("applies 25/25/20/15/15 weights to a 100-point total", () => {
    expect(trendScore({ novelty: 100, growth: 100, business: 100, developer: 100, content: 100 })).toBe(100);
    expect(trendScore({ novelty: 100, growth: 0, business: 0, developer: 0, content: 0 })).toBe(25);
    expect(trendScore({ novelty: 0, growth: 0, business: 100, developer: 0, content: 0 })).toBe(20);
    expect(trendScore({ novelty: 0, growth: 0, business: 0, developer: 100, content: 100 })).toBe(30);
  });
  it("clamps out-of-range AI scores", () => {
    expect(trendScore({ novelty: 500, growth: -20, business: 100, developer: 100, content: 100 })).toBe(75);
  });
});

describe("contentScore", () => {
  it("normalizes six 20-point criteria to 100", () => {
    const full = { trend: 20, originality: 20, audience_fit: 20, save_potential: 20, share_potential: 20, brand_fit: 20 };
    expect(contentScore(full)).toBe(100);
    expect(contentScore({ ...full, originality: 0, brand_fit: 0 })).toBe(67);
    expect(contentScore({ ...full, trend: 99 })).toBe(100);
  });
});

describe("growthScore", () => {
  it("rewards new mentions and momentum", () => {
    const fresh = growthScore({ mentionCount: 3, previousMentionCount: 0, importance: 50 });
    const flat = growthScore({ mentionCount: 3, previousMentionCount: 3, importance: 50 });
    const rising = growthScore({ mentionCount: 6, previousMentionCount: 3, importance: 50 });
    expect(fresh).toBeGreaterThan(flat);
    expect(rising).toBeGreaterThan(flat);
    expect(rising).toBeLessThanOrEqual(100);
  });
});

describe("performance & promotion", () => {
  it("computes weighted overall score", () => {
    expect(
      overallPerformance({ accuracy: 100, approvalRate: 100, usefulInsight: 100, originality: 100, taskCompletion: 100, contentPerformance: 100 }),
    ).toBe(100);
  });
  it("requires every promotion threshold and blocks max level", () => {
    const ok = { overall: 80, approvalRate: 70, accuracy: 80, completedTasks: 6, level: 2 };
    expect(isPromotionCandidate(ok)).toBe(true);
    expect(isPromotionCandidate({ ...ok, completedTasks: 2 })).toBe(false);
    expect(isPromotionCandidate({ ...ok, level: 6 })).toBe(false);
  });
  it("clamp handles NaN", () => {
    expect(clamp(Number.NaN, 0, 100)).toBe(0);
  });
});
