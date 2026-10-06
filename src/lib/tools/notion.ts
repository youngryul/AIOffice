import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";

export type NotionEntityType = "daily_brief" | "trend" | "opportunity" | "content_idea" | "meeting" | "approval" | "project";

/**
 * Notion Tool — AI Workflow 는 Notion API 를 직접 호출하지 않고 Queue 에만 적재한다.
 * (Notion 장애가 AI 업무 전체를 멈추지 않도록)
 */
export async function enqueueNotionSync(
  db: AdminSupabase,
  companyId: string,
  items: { entityType: NotionEntityType; entityId: string }[],
) {
  if (!items.length) return;
  const { data: settings } = await db
    .from("company_settings")
    .select("notion_auto_sync")
    .eq("company_id", companyId)
    .maybeSingle();
  if (settings && !settings.notion_auto_sync) return;

  for (const item of items) {
    // 이미 대기 중인 동일 작업이 있으면 partial unique index 위반(23505) → 무시
    const { error } = await db.from("notion_sync_queue").insert({
      company_id: companyId,
      entity_type: item.entityType,
      entity_id: item.entityId,
    });
    if (error && error.code !== "23505") console.error("[notion queue] enqueue failed", error.message);
  }
}
