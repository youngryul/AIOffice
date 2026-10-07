import { describe, expect, it } from "vitest";
import { sanitizeOutput } from "@/lib/agents/workflow/stages/research";
import type { FindingOutput, WorkOutput } from "@/lib/agents/schemas";

const finding = (title: string, urls: string[], importance = 50): FindingOutput => ({
  title,
  summary: title,
  category: "ai_trend",
  source_urls: urls,
  published_date: null,
  importance,
  novelty: 50,
  practical_value: 50,
  business_potential: 50,
  sns_potential: 50,
  developer_impact: 50,
  developer_try_worthy: false,
  try_reason: null,
  is_speculation: false,
});

const base: WorkOutput = {
  summary: "s",
  insights: [],
  recommendations: [],
  next_actions: [],
  confidence: 140,
  sources: [
    { title: "Real", url: "https://www.real.com/a?utm_source=x", publisher: null, published_at: null, source_type: "news" },
    { title: "Made up", url: "https://fake.example/b", publisher: null, published_at: null, source_type: "blog" },
    { title: "Bad scheme", url: "javascript:alert(1)", publisher: null, published_at: null, source_type: "other" },
  ],
  findings: [finding("A", ["https://real.com/a"], 120), finding("B", ["https://fake.example/b"]), finding("C", [])],
};

describe("sanitizeOutput (AI 추측 vs 실제 Source 구분)", () => {
  it("verifies only URLs that were actually retrieved and flags the rest as speculation", () => {
    const out = sanitizeOutput(base, ["https://real.com/a"]);
    expect(out.sources).toHaveLength(2); // javascript: 스킴 제거
    expect(out.sources.find((s) => s.title === "Real")?.verified).toBe(true);
    expect(out.sources.find((s) => s.title === "Made up")?.verified).toBe(false);
    expect(out.findings[0]).toMatchObject({ has_verified_source: true, is_speculation: false, importance: 100 });
    expect(out.findings[1]).toMatchObject({ has_verified_source: false, is_speculation: true });
    expect(out.findings[2].is_speculation).toBe(true);
    expect(out.confidence).toBe(100);
  });
});
