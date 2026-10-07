import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Client } from "@notionhq/client";
import { env } from "@/lib/env";

/**
 * Notion Public Integration OAuth.
 * state 에 company_id 를 HMAC 서명해 담아 CSRF / 회사 바꿔치기를 막는다.
 */
function stateSecret(): string {
  const e = env();
  const secret = e.APP_ENCRYPTION_KEY ?? e.NOTION_OAUTH_CLIENT_SECRET;
  if (!secret) throw new Error("APP_ENCRYPTION_KEY 가 필요합니다.");
  return secret;
}

export function createOAuthState(companyId: string): string {
  const payload = `${companyId}.${Date.now()}.${randomBytes(8).toString("hex")}`;
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyOAuthState(state: string, maxAgeMs = 10 * 60_000): string | null {
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const parts = decoded.split(".");
  if (parts.length !== 4) return null;
  const [companyId, ts, nonce, sig] = parts;
  const expected = createHmac("sha256", stateSecret()).update(`${companyId}.${ts}.${nonce}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Date.now() - Number(ts) > maxAgeMs) return null;
  return companyId;
}

export function notionAuthorizeUrl(state: string): string {
  const e = env();
  if (!e.NOTION_OAUTH_CLIENT_ID || !e.NOTION_OAUTH_REDIRECT_URI) throw new Error("Notion OAuth 환경변수가 설정되지 않았습니다.");
  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", e.NOTION_OAUTH_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("redirect_uri", e.NOTION_OAUTH_REDIRECT_URI);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeOAuthCode(code: string) {
  const e = env();
  if (!e.NOTION_OAUTH_CLIENT_ID || !e.NOTION_OAUTH_CLIENT_SECRET || !e.NOTION_OAUTH_REDIRECT_URI) {
    throw new Error("Notion OAuth 환경변수가 설정되지 않았습니다.");
  }
  return new Client().oauth.token({
    client_id: e.NOTION_OAUTH_CLIENT_ID,
    client_secret: e.NOTION_OAUTH_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: e.NOTION_OAUTH_REDIRECT_URI,
  });
}
