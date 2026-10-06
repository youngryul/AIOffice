"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** 브라우저용 클라이언트 (RLS 적용). 공개 키만 사용한다. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
  );
}
