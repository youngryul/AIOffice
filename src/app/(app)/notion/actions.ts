"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/services/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { errorMessage } from "@/lib/ai/errors";
import { extractNotionId, notionClient } from "@/lib/notion/client";
import { ensureNotionWorkspace } from "@/lib/notion/setup";
import { processNotionQueue } from "@/lib/notion/sync";
import { enqueueNotionSync, type NotionEntityType } from "@/lib/tools/notion";

export interface NotionActionState {
  error?: string;
  message?: string;
}

function done(message: string): NotionActionState {
  revalidatePath("/notion");
  return { message };
}

/** Integration Token 방식 연결 (토큰은 암호화 저장, 클라이언트로 다시 내려가지 않는다) */
export async function connectWithToken(_prev: NotionActionState, formData: FormData): Promise<NotionActionState> {
  const { companyId } = await requireCompany();
  const useEnv = formData.get("use_env") === "1";
  const token = useEnv ? env().NOTION_TOKEN : String(formData.get("token") ?? "").trim();
  if (!token) return { error: "Integration Token 을 입력하세요." };
  const parentRaw = String(formData.get("parent") ?? "").trim() || (useEnv ? env().NOTION_PARENT_PAGE_ID ?? "" : "");
  const parentId = parentRaw ? extractNotionId(parentRaw) : null;
  if (parentRaw && !parentId) return { error: "상위 페이지 URL 또는 ID 형식이 올바르지 않습니다." };

  try {
    const client = notionClient(token);
    const me = await client.users.me({});
    if (parentId) await client.pages.retrieve({ page_id: parentId }); // 접근 권한 확인
    const db = createAdminClient();
    await db.from("notion_connections").upsert(
      {
        company_id: companyId,
        auth_type: useEnv ? "env" : "token",
        access_token_enc: useEnv ? null : encryptSecret(token),
        bot_id: me.id,
        workspace_name: me.type === "bot" ? (me.bot.workspace_name ?? null) : null,
        parent_page_id: parentId,
        root_page_id: null,
        status: parentId ? "connected" : "needs_setup",
        last_error: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    );
    await db.from("notion_databases").delete().eq("company_id", companyId);
    if (parentId) {
      await ensureNotionWorkspace(db, companyId);
      return done("Notion 연결 완료! AI OFFICE 페이지와 Database 8개를 만들었습니다.");
    }
    return done("Notion 이 연결되었습니다. 이제 AI OFFICE 를 만들 상위 페이지를 선택하세요.");
  } catch (err) {
    return { error: `Notion 연결 실패: ${errorMessage(err)} — Integration 이 해당 페이지에 연결(Connections)되어 있는지 확인하세요.` };
  }
}

export async function selectParentPage(_prev: NotionActionState, formData: FormData): Promise<NotionActionState> {
  const { companyId } = await requireCompany();
  const pageId = extractNotionId(String(formData.get("page_id") ?? ""));
  if (!pageId) return { error: "페이지를 선택하세요." };
  const db = createAdminClient();
  await db.from("notion_connections").update({ parent_page_id: pageId, root_page_id: null }).eq("company_id", companyId);
  await db.from("notion_databases").delete().eq("company_id", companyId);
  try {
    await ensureNotionWorkspace(db, companyId);
    return done("AI OFFICE 워크스페이스를 만들었습니다.");
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function setupWorkspace(): Promise<NotionActionState> {
  const { companyId } = await requireCompany();
  try {
    await ensureNotionWorkspace(createAdminClient(), companyId);
    return done("워크스페이스 설정을 확인했습니다 (빠진 Database 를 생성).");
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function syncNow(): Promise<NotionActionState> {
  const { companyId } = await requireCompany();
  try {
    const stats = await processNotionQueue(createAdminClient(), { companyId, limit: 50 });
    return done(`동기화: 처리 ${stats.processed} · 완료 ${stats.done} · 재시도 예정 ${stats.retried} · 실패 ${stats.failed}`);
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function retryFailed(): Promise<NotionActionState> {
  const { supabase, companyId } = await requireCompany();
  await supabase
    .from("notion_sync_queue")
    .update({ status: "PENDING", retry_count: 0, next_attempt_at: new Date().toISOString(), error: null })
    .eq("company_id", companyId)
    .eq("status", "FAILED");
  return done("실패한 작업을 다시 대기열에 넣었습니다.");
}

/** 기존 데이터 전체를 Notion 큐에 적재 (처음 연결했을 때) */
export async function backfill(): Promise<NotionActionState> {
  const { supabase, companyId } = await requireCompany();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [briefs, trends, opps, contents, meetings, approvals, projects] = await Promise.all([
    supabase.from("daily_briefs").select("id").eq("company_id", companyId).gte("created_at", since),
    supabase.from("trends").select("id").eq("company_id", companyId).neq("status", "archived").gte("last_seen_at", since),
    supabase.from("opportunities").select("id").eq("company_id", companyId).gte("created_at", since),
    supabase.from("content_ideas").select("id").eq("company_id", companyId).gte("created_at", since),
    supabase.from("meetings").select("id").eq("company_id", companyId).gte("created_at", since),
    supabase.from("approvals").select("id").eq("company_id", companyId).neq("status", "PENDING"),
    supabase.from("projects").select("id").eq("company_id", companyId),
  ]);
  const pick = (type: NotionEntityType, rows: { id: string }[] | null) => (rows ?? []).map((r) => ({ entityType: type, entityId: r.id }));
  const items = [
    ...pick("daily_brief", briefs.data),
    ...pick("trend", trends.data),
    ...pick("opportunity", opps.data),
    ...pick("content_idea", contents.data),
    ...pick("meeting", meetings.data),
    ...pick("approval", approvals.data),
    ...pick("project", projects.data),
  ];
  await enqueueNotionSync(createAdminClient(), companyId, items);
  return done(`${items.length}건을 Notion 동기화 대기열에 넣었습니다. '지금 동기화' 를 누르거나 Cron 이 처리합니다.`);
}

export async function disconnectNotion() {
  const { supabase, companyId } = await requireCompany();
  await supabase.from("notion_connections").delete().eq("company_id", companyId);
  revalidatePath("/notion");
}

export async function toggleAutoSync(enabled: boolean) {
  const { supabase, companyId } = await requireCompany();
  await supabase.from("company_settings").update({ notion_auto_sync: z.boolean().parse(enabled) }).eq("company_id", companyId);
  revalidatePath("/notion");
}
