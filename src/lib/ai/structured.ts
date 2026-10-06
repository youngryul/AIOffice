import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { Tool } from "openai/resources/responses/responses";
import type { z } from "zod";
import { env } from "@/lib/env";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { assertWithinBudget } from "./budget";
import { AiNotConfiguredError, BudgetExceededError, errorMessage } from "./errors";
import { estimateCost, parsePricingOverrides } from "./pricing";

let client: OpenAI | null = null;
export function openai(): OpenAI {
  const key = env().OPENAI_API_KEY;
  if (!key) throw new AiNotConfiguredError();
  client ??= new OpenAI({ apiKey: key, maxRetries: 0, timeout: 180_000 });
  return client;
}

/** AI 호출 최대 재시도 횟수 (최초 1회 + 재시도 2회) */
export const AI_MAX_RETRIES = 2;

export interface AgentCaller {
  companyId: string;
  timezone: string;
  runId: string | null;
  taskId: string | null;
  employeeId: string | null;
  agent: string;
  model: string;
  maxOutputTokens: number;
  dailyBudget: number | null;
}

export interface StructuredCallResult<T> {
  output: T;
  /** 실제 웹 검색에서 수집된 URL (출처 검증용) */
  retrievedUrls: string[];
  costUsd: number;
}

interface CallParams<S extends z.ZodType> {
  db: AdminSupabase;
  caller: AgentCaller;
  purpose: string;
  schema: S;
  schemaName: string;
  instructions: string;
  input: string;
  tools?: Tool[];
}

function collectRetrievedUrls(response: OpenAI.Responses.Response): string[] {
  const urls = new Set<string>();
  for (const item of response.output) {
    if (item.type === "web_search_call" && item.action?.type === "search") {
      for (const s of item.action.sources ?? []) if (s.url) urls.add(s.url);
    }
    if (item.type === "message") {
      for (const c of item.content) {
        if (c.type === "output_text") {
          for (const a of c.annotations) if (a.type === "url_citation") urls.add(a.url);
        }
      }
    }
  }
  return [...urls];
}

function isRetryable(err: unknown): boolean {
  if (err instanceof BudgetExceededError || err instanceof AiNotConfiguredError) return false;
  if (err instanceof OpenAI.APIError) {
    const status = err.status ?? 0;
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }
  // 파싱 실패 / 네트워크 오류는 재시도
  return true;
}

/**
 * 모든 AI 호출의 단일 진입점.
 *  - 예산 확인 → OpenAI Responses API(Structured Output) → 사용량/비용 기록
 *  - 실패 시 최대 2회 재시도, 무한 재시도 없음
 */
export async function callStructured<S extends z.ZodType>(params: CallParams<S>): Promise<StructuredCallResult<z.infer<S>>> {
  const { db, caller } = params;
  const e = env();
  const overrides = parsePricingOverrides(e.AI_PRICING_JSON);
  let lastError: unknown;

  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
    await assertWithinBudget(db, {
      companyId: caller.companyId,
      employeeId: caller.employeeId,
      dailyBudget: caller.dailyBudget,
      timezone: caller.timezone,
    });

    try {
      const response = await openai().responses.parse({
        model: caller.model,
        instructions: params.instructions,
        input: params.input,
        tools: params.tools,
        include: params.tools?.some((t) => t.type === "web_search") ? ["web_search_call.action.sources"] : undefined,
        max_output_tokens: caller.maxOutputTokens,
        text: { format: zodTextFormat(params.schema, params.schemaName) },
      });

      const usage = response.usage;
      const webSearchCalls = response.output.filter((o) => o.type === "web_search_call").length;
      const costUsd = estimateCost({
        model: caller.model,
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        cachedTokens: usage?.input_tokens_details?.cached_tokens ?? 0,
        webSearchCalls,
        webSearchCostPerCall: e.AI_WEB_SEARCH_COST_PER_CALL,
        overrides,
      });

      await logUsage(db, caller, {
        purpose: params.purpose,
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        cachedTokens: usage?.input_tokens_details?.cached_tokens ?? 0,
        webSearchCalls,
        cost: costUsd,
        success: response.output_parsed !== null,
        error: response.output_parsed === null ? `parse failed (status=${response.status})` : null,
      });

      if (response.output_parsed === null) {
        throw new Error(`AI 응답을 구조화하지 못했습니다 (status: ${response.status}, reason: ${response.incomplete_details?.reason ?? "unknown"})`);
      }
      return { output: response.output_parsed as z.infer<S>, retrievedUrls: collectRetrievedUrls(response), costUsd };
    } catch (err) {
      lastError = err;
      if (err instanceof OpenAI.APIError) {
        await logUsage(db, caller, {
          purpose: params.purpose,
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          webSearchCalls: 0,
          cost: 0,
          success: false,
          error: errorMessage(err),
        });
      }
      if (!isRetryable(err) || attempt === AI_MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(errorMessage(lastError));
}

/** 의미 유사도 기반 중복 제거용 embedding (실패해도 workflow 는 계속된다) */
export async function embedTexts(db: AdminSupabase, caller: AgentCaller, texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0 || !env().OPENAI_API_KEY) return null;
  try {
    const model = "text-embedding-3-small";
    const res = await openai().embeddings.create({ model, input: texts });
    const tokens = res.usage?.prompt_tokens ?? 0;
    await logUsage(db, { ...caller, model }, {
      purpose: "dedupe_embedding",
      inputTokens: tokens,
      outputTokens: 0,
      cachedTokens: 0,
      webSearchCalls: 0,
      cost: estimateCost({ model, inputTokens: tokens, outputTokens: 0 }),
      success: true,
      error: null,
    });
    return res.data.map((d) => d.embedding);
  } catch {
    return null;
  }
}

async function logUsage(
  db: AdminSupabase,
  caller: AgentCaller,
  u: {
    purpose: string;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    webSearchCalls: number;
    cost: number;
    success: boolean;
    error: string | null;
  },
) {
  const { error } = await db.from("ai_usage").insert({
    company_id: caller.companyId,
    run_id: caller.runId,
    task_id: caller.taskId,
    employee_id: caller.employeeId,
    agent: caller.agent,
    model: caller.model,
    purpose: u.purpose,
    input_tokens: u.inputTokens,
    output_tokens: u.outputTokens,
    cached_tokens: u.cachedTokens,
    web_search_calls: u.webSearchCalls,
    estimated_cost: u.cost,
    success: u.success,
    error: u.error,
  });
  if (error) console.error("[ai_usage] insert failed", error.message);
}
