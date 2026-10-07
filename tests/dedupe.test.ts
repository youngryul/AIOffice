import { describe, expect, it } from "vitest";
import { cosineSimilarity, groupDuplicates, normalizeUrl, slugify, titleSimilarity } from "@/lib/agents/dedupe";

describe("normalizeUrl", () => {
  it("strips tracking params, www, hash and trailing slash", () => {
    expect(normalizeUrl("https://www.Example.com/news/a/?utm_source=x&id=2#top")).toBe("https://example.com/news/a?id=2");
    expect(normalizeUrl("http://example.com/")).toBe("https://example.com/");
  });
  it("rejects non-http schemes", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
});

describe("similarity", () => {
  it("detects near-identical titles (KR/EN)", () => {
    expect(titleSimilarity("OpenAI launches new Agent SDK", "OpenAI launches new Agents SDK")).toBeGreaterThan(0.72);
    expect(titleSimilarity("Cursor 2.0 출시", "Cursor 2.0 정식 출시")).toBeGreaterThan(0.72);
    expect(titleSimilarity("NVIDIA earnings", "Claude Code hooks")).toBeLessThan(0.3);
  });
  it("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe("groupDuplicates", () => {
  it("groups by shared URL, similar title and embedding", () => {
    const groups = groupDuplicates([
      { title: "OpenAI launches new Agent SDK", urls: ["https://a.com/1"] },
      { title: "Totally different", urls: ["https://www.a.com/1/?utm_medium=rss"] },
      { title: "OpenAI launches new Agents SDK", urls: ["https://b.com/x"] },
      { title: "MCP spec update", urls: ["https://c.com"], embedding: [1, 0, 0] },
      { title: "Model Context Protocol revision", urls: ["https://d.com"], embedding: [0.99, 0.05, 0] },
      { title: "Robot vacuum", urls: ["https://e.com"] },
    ]);
    expect(groups[1]).toBe(0);
    expect(groups[2]).toBe(0);
    expect(groups[4]).toBe(3);
    expect(groups[5]).toBe(5);
  });
});

describe("slugify", () => {
  it("keeps Korean and alphanumerics", () => {
    expect(slugify("MCP 생태계 확장!")).toBe("mcp-생태계-확장");
  });
});
