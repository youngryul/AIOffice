import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { errorMessage } from "@/lib/ai/errors";
import type { NotionEntityType } from "@/lib/tools/notion";
import { getCompanyNotion } from "./client";
import { buildNotionPage } from "./mappers";

/** Notion Sync 최대 재시도 횟수 */
export const NOTION_MAX_RETRIES = 3;

type Job = Tables<"notion_sync_queue">;

/**
 * Notion Sync Worker.
 * AI Result → Supabase → notion_sync_queue → (여기) → Notion API
 * 실패하면 지수 backoff 로 최대 3회 재시도 후 FAILED.
 */
export async function processNotionQueue(db: AdminSupabase, opts: { companyId?: string; limit?: number } = {}) {
  const { data: jobs, error } = await db.rpc("claim_notion_jobs", {
    p_limit: opts.limit ?? 20,
    p_company_id: opts.companyId,
  });
  if (error) throw new Error(`Notion 작업 조회 실패: ${error.message}`);

  const stats = { processed: 0, done: 0, failed: 0, retried: 0 };
  const byCompany = new Map<string, Job[]>();
  for (const j of jobs ?? []) byCompany.set(j.company_id, [...(byCompany.get(j.company_id) ?? []), j]);

  for (const [companyId, companyJobs] of byCompany) {
    let notion: Awaited<ReturnType<typeof getCompanyNotion>> = null;
    let setupError: string | null = null;
    try {
      notion = await getCompanyNotion(db, companyId);
      if (!notion) setupError = "Notion 이 연결되어 있지 않습니다.";
    } catch (err) {
      setupError = errorMessage(err);
    }
    const { data: dbs } = await db.from("notion_databases").select("key, data_source_id").eq("company_id", companyId);
    const dataSources = new Map((dbs ?? []).map((d) => [d.key, d.data_source_id]));

    for (const job of companyJobs) {
      stats.processed++;
      try {
        if (!notion) throw new Error(setupError ?? "Notion 연결 오류");
        const payload = await buildNotionPage(db, companyId, job.entity_type as NotionEntityType, job.entity_id);
        if (!payload) {
          await finish(db, job, "DONE", null, "원본 데이터가 삭제되어 건너뜀");
          stats.done++;
          continue;
        }
        const dataSourceId = dataSources.get(payload.dbKey);
        if (!dataSourceId) throw new Error(`Notion Database(${payload.dbKey})가 아직 생성되지 않았습니다. Notion 페이지에서 '워크스페이스 설정'을 실행하세요.`);

        const { data: mapping } = await db
          .from("notion_pages")
          .select("page_id")
          .eq("entity_type", job.entity_type)
          .eq("entity_id", job.entity_id)
          .maybeSingle();

        let pageId: string;
        if (mapping) {
          await notion.client.pages.update({ page_id: mapping.page_id, properties: payload.properties });
          pageId = mapping.page_id;
        } else {
          const page = await notion.client.pages.create({
            parent: { type: "data_source_id", data_source_id: dataSourceId },
            properties: payload.properties,
            children: payload.children.slice(0, 100),
          });
          pageId = page.id;
          await db.from("notion_pages").upsert({
            company_id: companyId,
            entity_type: job.entity_type,
            entity_id: job.entity_id,
            page_id: pageId,
          });
        }
        await finish(db, job, "DONE", pageId, null);
        stats.done++;
      } catch (err) {
        const retry = job.retry_count + 1;
        if (retry >= NOTION_MAX_RETRIES) {
          await finish(db, job, "FAILED", null, errorMessage(err), retry);
          stats.failed++;
        } else {
          await db
            .from("notion_sync_queue")
            .update({
              status: "PENDING",
              retry_count: retry,
              error: errorMessage(err),
              next_attempt_at: new Date(Date.now() + 2 ** retry * 60_000).toISOString(),
            })
            .eq("id", job.id);
          stats.retried++;
        }
      }
    }
  }
  return stats;
}

async function finish(db: AdminSupabase, job: Job, status: "DONE" | "FAILED", pageId: string | null, error: string | null, retry?: number) {
  await db
    .from("notion_sync_queue")
    .update({
      status,
      notion_page_id: pageId,
      error,
      retry_count: retry ?? job.retry_count,
      synced_at: status === "DONE" ? new Date().toISOString() : null,
    })
    .eq("id", job.id);
}
