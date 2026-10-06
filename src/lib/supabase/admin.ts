import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Service Role 클라이언트 — RLS 를 우회한다.
 * 반드시 서버에서만, 그리고 "인증된 사용자의 profile 에서 읽은 company_id" 또는
 * cron 에서 조회한 company_id 로만 범위를 제한해서 사용한다.
 */
let adminClient: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createAdminClient() {
  if (adminClient) return adminClient;
  const e = env();
  adminClient = createSupabaseClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export type AdminSupabase = ReturnType<typeof createAdminClient>;
