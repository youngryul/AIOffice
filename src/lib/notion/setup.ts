import "server-only";
import type { Client } from "@notionhq/client";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { errorMessage } from "@/lib/ai/errors";
import { getCompanyNotion } from "./client";
import { NOTION_DATABASES, NOTION_DB_KEYS } from "./schema";

/**
 * 처음 연결하면 선택한 상위 페이지 아래에 "AI OFFICE" 페이지와 Database 8개를 만든다.
 * 이미 만들어진 것은 건너뛰므로 여러 번 실행해도 안전하다(idempotent).
 */
export async function ensureNotionWorkspace(db: AdminSupabase, companyId: string) {
  const notion = await getCompanyNotion(db, companyId);
  if (!notion) throw new Error("Notion 이 연결되어 있지 않습니다.");
  const { conn, client } = notion;
  if (!conn.parent_page_id) throw new Error("AI OFFICE 를 만들 상위 Notion 페이지를 먼저 선택하세요.");

  try {
    let rootId = conn.root_page_id;
    if (rootId) {
      // 사용자가 페이지를 지웠으면 다시 만든다
      try {
        const page = await client.pages.retrieve({ page_id: rootId });
        if ("in_trash" in page && page.in_trash) rootId = null;
      } catch {
        rootId = null;
      }
    }
    if (!rootId) {
      const page = await client.pages.create({
        parent: { type: "page_id", page_id: conn.parent_page_id },
        icon: { type: "emoji", emoji: "🏢" },
        properties: { title: { title: [{ text: { content: "AI OFFICE" } }] } },
        children: [
          {
            object: "block",
            type: "callout",
            callout: {
              icon: { type: "emoji", emoji: "🤖" },
              rich_text: [{ type: "text", text: { content: "AI Office 의 AI 직원들이 자동으로 정리하는 공간입니다. 데이터는 앱 DB 에 먼저 저장된 뒤 동기화됩니다." } }],
            },
          },
        ],
      });
      rootId = page.id;
      await db.from("notion_databases").delete().eq("company_id", companyId); // 새 루트 → DB 도 새로
      await db.from("notion_connections").update({ root_page_id: rootId }).eq("company_id", companyId);
    }

    const { data: existing } = await db.from("notion_databases").select("key").eq("company_id", companyId);
    const have = new Set((existing ?? []).map((d) => d.key));
    for (const key of NOTION_DB_KEYS) {
      if (have.has(key)) continue;
      const def = NOTION_DATABASES[key];
      const created = await client.databases.create({
        parent: { type: "page_id", page_id: rootId },
        title: [{ type: "text", text: { content: def.title } }],
        icon: { type: "emoji", emoji: def.icon as never },
        initial_data_source: { properties: def.properties },
      });
      const dataSourceId = await dataSourceIdOf(client, created);
      await db.from("notion_databases").insert({
        company_id: companyId,
        key,
        database_id: created.id,
        data_source_id: dataSourceId,
        title: def.title,
      });
    }
    await db.from("notion_connections").update({ status: "connected", last_error: null }).eq("company_id", companyId);
    return { rootPageId: rootId };
  } catch (err) {
    await db.from("notion_connections").update({ status: "error", last_error: errorMessage(err) }).eq("company_id", companyId);
    throw err;
  }
}

async function dataSourceIdOf(client: Client, db: { id: string } & Partial<{ data_sources: { id: string }[] }>): Promise<string> {
  if (db.data_sources?.[0]?.id) return db.data_sources[0].id;
  const full = await client.databases.retrieve({ database_id: db.id });
  const id = "data_sources" in full ? full.data_sources[0]?.id : undefined;
  if (!id) throw new Error("Notion data source ID 를 찾을 수 없습니다.");
  return id;
}

/** 통합(Integration)이 접근 가능한 페이지 목록 — 상위 페이지 선택 UI 용 */
export async function listAccessiblePages(client: Client, query = "") {
  const res = await client.search({
    query,
    filter: { property: "object", value: "page" },
    page_size: 30,
  });
  return res.results
    .map((r) => {
      if (r.object !== "page" || !("properties" in r)) return null;
      const titleProp = Object.values(r.properties).find((p) => p.type === "title");
      const title = titleProp && titleProp.type === "title" ? titleProp.title.map((t) => t.plain_text).join("") : "";
      return { id: r.id, title: title || "(제목 없음)", url: "url" in r ? r.url : null };
    })
    .filter((p): p is { id: string; title: string; url: string | null } => p !== null);
}
