import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { featureFlags } from "@/lib/env";
import { getCompanyNotion } from "@/lib/notion/client";
import { listAccessiblePages } from "@/lib/notion/setup";
import { NOTION_DATABASES, NOTION_DB_KEYS } from "@/lib/notion/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, Stat } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";
import { errorMessage } from "@/lib/ai/errors";
import { daysAgoIso } from "@/lib/time";
import { disconnectNotion } from "./actions";
import { ParentPagePicker, QueueActions, TokenConnectForm } from "./notion-panels";

export const metadata: Metadata = { title: "Notion" };

export default async function NotionPage({ searchParams }: { searchParams: Promise<{ error?: string; connected?: string }> }) {
  const { error: oauthError, connected } = await searchParams;
  const { supabase, companyId, settings } = await requireCompany();
  const flags = featureFlags();

  // 사용자 세션으로 조회: access_token_enc 컬럼은 SELECT 권한 자체가 없다
  const [{ data: conn }, { data: dbs }, { data: queue }, { data: failed }] = await Promise.all([
    supabase
      .from("notion_connections")
      .select("auth_type, workspace_name, parent_page_id, root_page_id, status, last_error, connected_at")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase.from("notion_databases").select("key, database_id, title").eq("company_id", companyId),
    supabase.from("notion_sync_queue").select("status").eq("company_id", companyId).gte("created_at", daysAgoIso(30)),
    supabase.from("notion_sync_queue").select("id, entity_type, error, retry_count, created_at").eq("company_id", companyId).eq("status", "FAILED").order("created_at", { ascending: false }).limit(10),
  ]);

  let pages: { id: string; title: string }[] = [];
  let pageError: string | null = null;
  if (conn && !conn.parent_page_id) {
    try {
      const notion = await getCompanyNotion(createAdminClient(), companyId);
      if (notion) pages = await listAccessiblePages(notion.client);
    } catch (err) {
      pageError = errorMessage(err);
    }
  }

  const count = (s: string) => (queue ?? []).filter((q) => q.status === s).length;
  const haveDbs = new Set((dbs ?? []).map((d) => d.key));

  return (
    <div className="grid gap-6">
      <PageHeader title="Notion 연동" description="AI Result → Supabase → Notion Sync Queue → Notion API. Notion 장애가 AI 업무를 멈추지 않습니다." />
      {oauthError ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">Notion OAuth 실패: {oauthError}</p> : null}
      {connected ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Notion 계정이 연결되었습니다. 상위 페이지를 선택하세요.</p> : null}

      {!conn ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="grid content-start gap-3 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">방법 1. Notion OAuth (권장)</h2>
            <p className="text-sm text-muted-foreground">Notion 로그인 화면에서 AI Office 가 접근할 페이지를 직접 고릅니다.</p>
            {flags.notionOAuth ? (
              <Button asChild className="w-fit">
                <a href="/api/notion/oauth/start">Notion 으로 연결</a>
              </Button>
            ) : (
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                NOTION_OAUTH_CLIENT_ID / NOTION_OAUTH_CLIENT_SECRET / NOTION_OAUTH_REDIRECT_URI 환경변수를 설정하면 활성화됩니다 (README 참고).
              </p>
            )}
          </section>
          <section className="grid content-start gap-3 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">방법 2. Integration Token</h2>
            <TokenConnectForm envTokenAvailable={flags.notionEnvToken} />
          </section>
        </div>
      ) : (
        <>
          <section className="grid gap-3 rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">연결 상태</h2>
                <Badge variant={conn.status === "connected" ? "success" : conn.status === "error" ? "danger" : "warning"}>{conn.status}</Badge>
                <Badge variant="outline">{conn.auth_type}</Badge>
                {conn.workspace_name ? <span className="text-sm text-muted-foreground">{conn.workspace_name}</span> : null}
              </div>
              <form action={disconnectNotion}>
                <Button size="sm" variant="ghost">
                  연결 해제
                </Button>
              </form>
            </div>
            {conn.last_error ? <p className="text-sm text-rose-600">{conn.last_error}</p> : null}
            {!conn.parent_page_id ? (
              pageError ? <p className="text-sm text-rose-600">{pageError}</p> : <ParentPagePicker pages={pages} />
            ) : (
              <p className="text-sm text-muted-foreground">
                연결일 {formatDateTime(conn.connected_at)}
                {conn.root_page_id ? (
                  <>
                    {" · "}
                    <a href={`https://www.notion.so/${conn.root_page_id.replace(/-/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      AI OFFICE 페이지 열기
                    </a>
                  </>
                ) : null}
              </p>
            )}
          </section>

          <section className="grid gap-3 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">AI OFFICE Database</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {NOTION_DB_KEYS.map((k) => (
                <li key={k} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>
                    {NOTION_DATABASES[k].icon} {NOTION_DATABASES[k].title}
                  </span>
                  {haveDbs.has(k) ? <Badge variant="success">생성됨</Badge> : <Badge variant="outline">대기</Badge>}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-4 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Sync Queue (최근 30일)</h2>
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="PENDING" value={count("PENDING")} />
              <Stat label="PROCESSING" value={count("PROCESSING")} />
              <Stat label="DONE" value={count("DONE")} />
              <Stat label="FAILED" value={count("FAILED")} hint="최대 3회 재시도 후" />
            </div>
            <QueueActions autoSync={settings.notion_auto_sync} />
            {failed?.length ? (
              <ul className="divide-y rounded-lg border text-sm">
                {failed.map((f) => (
                  <li key={f.id} className="px-3 py-2">
                    <span className="font-medium">{f.entity_type}</span> · retry {f.retry_count} · {formatDateTime(f.created_at)}
                    <p className="text-xs text-rose-600">{f.error}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Cron(<code>/api/cron/tick</code>)이 주기적으로 대기열을 처리합니다. 설정 방법은 <Link href="/settings" className="underline">설정</Link> 과 README 를 참고하세요.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
