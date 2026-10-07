import "server-only";
import { Client } from "@notionhq/client";
import { env } from "@/lib/env";
import { decryptSecret } from "@/lib/crypto";
import type { AdminSupabase } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

export const NOTION_VERSION = "2025-09-03";

export type NotionConnection = Tables<"notion_connections">;

export function notionClient(token: string): Client {
  return new Client({ auth: token, notionVersion: NOTION_VERSION, timeoutMs: 30_000 });
}

/** 연결 방식(oauth / token / env)에 따라 실제 토큰을 얻는다 */
export function resolveToken(conn: Pick<NotionConnection, "auth_type" | "access_token_enc">): string {
  if (conn.auth_type === "env") {
    const token = env().NOTION_TOKEN;
    if (!token) throw new Error("NOTION_TOKEN 환경변수가 없습니다.");
    return token;
  }
  if (!conn.access_token_enc) throw new Error("저장된 Notion 토큰이 없습니다. 다시 연결하세요.");
  return decryptSecret(conn.access_token_enc);
}

export async function getCompanyNotion(db: AdminSupabase, companyId: string) {
  const { data: conn } = await db.from("notion_connections").select("*").eq("company_id", companyId).maybeSingle();
  if (!conn || conn.status === "disconnected") return null;
  return { conn, client: notionClient(resolveToken(conn)) };
}

/** Notion URL 또는 ID 문자열에서 32자리 page id 추출 */
export function extractNotionId(input: string): string | null {
  const compact = input.replace(/-/g, "");
  const match = compact.match(/([0-9a-f]{32})(?!.*[0-9a-f]{32})/i);
  if (!match) return null;
  const id = match[1].toLowerCase();
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}
