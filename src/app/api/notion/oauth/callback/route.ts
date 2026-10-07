import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/services/session";
import { encryptSecret } from "@/lib/crypto";
import { exchangeOAuthCode, verifyOAuthState } from "@/lib/notion/oauth";
import { ensureNotionWorkspace } from "@/lib/notion/setup";
import { errorMessage } from "@/lib/ai/errors";

/**
 * Notion OAuth callback.
 * state(HMAC 서명) 의 company_id 와 현재 로그인 사용자의 company_id 가 일치해야 저장한다.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fail = (msg: string) => NextResponse.redirect(new URL(`/notion?error=${encodeURIComponent(msg)}`, request.url));

  if (searchParams.get("error")) return fail(searchParams.get("error") ?? "access_denied");
  const code = searchParams.get("code");
  const companyId = verifyOAuthState(searchParams.get("state") ?? "");
  if (!code || !companyId) return fail("잘못된 요청입니다 (state 검증 실패). 다시 시도하세요.");

  const session = await getSession();
  if (!session || session.profile?.company_id !== companyId) return fail("로그인한 회사와 연결 요청이 일치하지 않습니다.");

  try {
    const token = await exchangeOAuthCode(code);
    const db = createAdminClient();
    // OAuth 화면에서 사용자가 템플릿을 복제했다면 그 페이지를 상위 페이지로 사용
    const parent = token.duplicated_template_id ?? null;
    await db.from("notion_connections").upsert(
      {
        company_id: companyId,
        auth_type: "oauth",
        access_token_enc: encryptSecret(token.access_token),
        workspace_id: token.workspace_id,
        workspace_name: token.workspace_name,
        bot_id: token.bot_id,
        parent_page_id: parent,
        root_page_id: null,
        status: parent ? "connected" : "needs_setup",
        last_error: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    );
    await db.from("notion_databases").delete().eq("company_id", companyId);
    if (parent) await ensureNotionWorkspace(db, companyId);
    return NextResponse.redirect(new URL("/notion?connected=1", request.url));
  } catch (err) {
    return fail(errorMessage(err));
  }
}
