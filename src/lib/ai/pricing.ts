/**
 * 모델별 가격 (USD / 1M tokens). 실제 가격은 OpenAI 가격 페이지에서 확인 후
 * AI_PRICING_JSON 환경변수로 덮어쓸 수 있다.
 *   예) AI_PRICING_JSON='{"gpt-5":{"input":1.25,"cachedInput":0.125,"output":10}}'
 */
export interface ModelPrice {
  input: number;
  cachedInput: number;
  output: number;
}

export const DEFAULT_PRICING: Record<string, ModelPrice> = {
  "gpt-5": { input: 1.25, cachedInput: 0.125, output: 10 },
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2 },
  "gpt-5-nano": { input: 0.05, cachedInput: 0.005, output: 0.4 },
  "gpt-4.1": { input: 2, cachedInput: 0.5, output: 8 },
  "gpt-4.1-mini": { input: 0.4, cachedInput: 0.1, output: 1.6 },
  "gpt-4o-mini": { input: 0.15, cachedInput: 0.075, output: 0.6 },
  "text-embedding-3-small": { input: 0.02, cachedInput: 0.02, output: 0 },
};

/** 알 수 없는 모델은 비용을 과소 추정하지 않도록 보수적인 가격을 사용한다. */
export const FALLBACK_PRICE: ModelPrice = { input: 2.5, cachedInput: 0.25, output: 15 };

export function resolvePrice(model: string, overrides?: Record<string, ModelPrice>): ModelPrice {
  const table = { ...DEFAULT_PRICING, ...overrides };
  if (table[model]) return table[model];
  // 날짜 스냅샷 모델명 (예: gpt-5-mini-2025-08-07) → 기본 모델 가격
  const base = Object.keys(table)
    .sort((a, b) => b.length - a.length)
    .find((k) => model.startsWith(`${k}-`));
  return base ? table[base] : FALLBACK_PRICE;
}

export function estimateCost(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  webSearchCalls?: number;
  webSearchCostPerCall?: number;
  overrides?: Record<string, ModelPrice>;
}): number {
  const price = resolvePrice(params.model, params.overrides);
  const cached = Math.min(params.cachedTokens ?? 0, params.inputTokens);
  const uncached = params.inputTokens - cached;
  const tokenCost = (uncached * price.input + cached * price.cachedInput + params.outputTokens * price.output) / 1_000_000;
  const searchCost = (params.webSearchCalls ?? 0) * (params.webSearchCostPerCall ?? 0);
  return Number((tokenCost + searchCost).toFixed(6));
}

export function parsePricingOverrides(json: string | undefined): Record<string, ModelPrice> | undefined {
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as Record<string, ModelPrice>;
    return typeof parsed === "object" && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}
