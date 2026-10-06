import "server-only";
import { z } from "zod";

/**
 * 서버 전용 환경변수. 클라이언트 번들에 절대 포함되지 않는다 ("server-only").
 * 필수 값이 없으면 명확한 에러 메시지로 실패한다 (조용히 undefined 를 쓰지 않는다).
 */
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_ENCRYPTION_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL_JUNIOR: z.string().default("gpt-5-mini"),
  AI_MODEL_SENIOR: z.string().default("gpt-5-mini"),
  AI_MODEL_EXECUTIVE: z.string().default("gpt-5"),
  AI_PRICING_JSON: z.string().optional(),
  AI_WEB_SEARCH_COST_PER_CALL: z.coerce.number().default(0.01),

  SEARCH_PROVIDER: z.enum(["openai", "tavily"]).default("openai"),
  TAVILY_API_KEY: z.string().optional(),

  NOTION_TOKEN: z.string().optional(),
  NOTION_PARENT_PAGE_ID: z.string().optional(),
  NOTION_OAUTH_CLIENT_ID: z.string().optional(),
  NOTION_OAUTH_CLIENT_SECRET: z.string().optional(),
  NOTION_OAUTH_REDIRECT_URI: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

function emptyToUndefined(value: string | undefined) {
  return value === undefined || value.trim() === "" ? undefined : value;
}

export function env(): ServerEnv {
  if (cached) return cached;
  const raw: Record<string, string | undefined> = {};
  for (const key of Object.keys(serverSchema.shape)) raw[key] = emptyToUndefined(process.env[key]);
  // 레거시 Supabase 키 이름 호환 (anon / service_role)
  raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= emptyToUndefined(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  raw.SUPABASE_SECRET_KEY ??= emptyToUndefined(process.env.SUPABASE_SERVICE_ROLE_KEY);
  raw.APP_URL ??= emptyToUndefined(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined;

  const parsed = serverSchema.safeParse(raw);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`환경변수 설정 오류: ${missing}. .env.example 을 참고해 .env.local 을 작성하세요.`);
  }
  cached = parsed.data;
  return cached;
}

/** 기능별 설정 여부 (UI 에서 안내 메시지를 보여주기 위해 사용) */
export function featureFlags() {
  const e = env();
  return {
    openai: Boolean(e.OPENAI_API_KEY),
    tavily: Boolean(e.TAVILY_API_KEY),
    notionOAuth: Boolean(e.NOTION_OAUTH_CLIENT_ID && e.NOTION_OAUTH_CLIENT_SECRET && e.NOTION_OAUTH_REDIRECT_URI),
    notionEnvToken: Boolean(e.NOTION_TOKEN),
    encryption: Boolean(e.APP_ENCRYPTION_KEY),
    cron: Boolean(e.CRON_SECRET),
  };
}
