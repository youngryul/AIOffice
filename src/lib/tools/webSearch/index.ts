import "server-only";
import type { Tool } from "openai/resources/responses/responses";
import { env } from "@/lib/env";
import { wrapUntrusted } from "@/lib/agents/prompts/safety";

/**
 * Web Search Adapter.
 *  - openai : 모델 호출에 OpenAI 내장 web_search tool 을 붙인다.
 *  - tavily : 별도 검색 API 로 먼저 검색하고 결과를 UNTRUSTED_EXTERNAL_CONTENT 로 감싸 전달한다.
 * 새 검색 API 를 추가하려면 WebSearchProvider 를 구현하고 getWebSearchProvider 에 등록한다.
 */
export interface SearchPreparation {
  /** 모델 호출에 붙일 tool (openai provider) */
  tools: Tool[];
  /** 프롬프트에 넣을 외부 콘텐츠 (이미 UNTRUSTED 로 감싸져 있음) */
  externalContent: string | null;
  /** 사전 검색으로 수집한 URL (출처 검증용) */
  retrievedUrls: string[];
}

export interface WebSearchProvider {
  readonly name: string;
  prepare(queries: string[]): Promise<SearchPreparation>;
}

class OpenAIWebSearch implements WebSearchProvider {
  readonly name = "openai";
  async prepare(): Promise<SearchPreparation> {
    return {
      tools: [{ type: "web_search", search_context_size: "medium" }],
      externalContent: null,
      retrievedUrls: [],
    };
  }
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
}

class TavilyWebSearch implements WebSearchProvider {
  readonly name = "tavily";
  constructor(private readonly apiKey: string) {}

  async prepare(queries: string[]): Promise<SearchPreparation> {
    const results: TavilyResult[] = [];
    for (const query of queries.slice(0, 4)) {
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify({ query, max_results: 5, topic: "news", days: 7, search_depth: "basic" }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) continue;
        const json = (await res.json()) as { results?: TavilyResult[] };
        results.push(...(json.results ?? []));
      } catch {
        // 검색 실패는 해당 쿼리만 건너뛴다
      }
    }
    const unique = [...new Map(results.map((r) => [r.url, r])).values()].slice(0, 20);
    const body = unique
      .map((r, i) => `#${i + 1} ${r.title}\nURL: ${r.url}\nDATE: ${r.published_date ?? "unknown"}\n${r.content.slice(0, 800)}`)
      .join("\n\n");
    return {
      tools: [],
      externalContent: unique.length ? wrapUntrusted("web_search_results", body) : null,
      retrievedUrls: unique.map((r) => r.url),
    };
  }
}

export function getWebSearchProvider(): WebSearchProvider {
  const e = env();
  if (e.SEARCH_PROVIDER === "tavily" && e.TAVILY_API_KEY) return new TavilyWebSearch(e.TAVILY_API_KEY);
  return new OpenAIWebSearch();
}
