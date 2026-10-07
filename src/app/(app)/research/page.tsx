import type { Metadata } from "next";
import { requireCompany } from "@/lib/services/session";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, ScorePill } from "@/components/ui/misc";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "리서치" };

interface StoredFinding {
  title: string;
  summary: string;
  category: string;
  importance: number;
  is_speculation: boolean;
  has_verified_source?: boolean;
  source_urls: string[];
  developer_try_worthy?: boolean;
  try_reason?: string | null;
}
interface StoredOutput {
  summary: string;
  findings?: StoredFinding[];
  insights?: string[];
  recommendations?: string[];
  next_actions?: string[];
}

export default async function ResearchPage() {
  const { supabase, companyId } = await requireCompany();
  const [{ data: results }, { data: sources }] = await Promise.all([
    supabase
      .from("task_results")
      .select("*, tasks(title), employees:employee_id(name, avatar), reviewer:reviewer_id(name)")
      .eq("company_id", companyId)
      .eq("stage", "research")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("sources").select("*").eq("company_id", companyId).order("retrieved_at", { ascending: false }).limit(40),
  ]);

  return (
    <div className="grid gap-8">
      <PageHeader title="리서치 결과" description="리서처의 원본 결과물입니다. 팩트체크를 통과한 Finding 만 트렌드와 CEO 보고서에 반영됩니다." />
      {results?.length ? (
        <div className="grid gap-4">
          {results.map((r) => {
            const out = r.output as unknown as StoredOutput;
            const emp = r.employees as { name: string; avatar: string } | null;
            const reviewer = r.reviewer as { name: string } | null;
            return (
              <article key={r.id} className="grid gap-3 rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {emp ? `${emp.avatar} ${emp.name}` : ""} · {formatDateTime(r.created_at)} · 신뢰도 {Math.round(Number(r.confidence ?? 0))}
                    </p>
                    <h2 className="font-semibold">{(r.tasks as { title: string } | null)?.title}</h2>
                  </div>
                  <Badge variant={r.review_status === "passed" ? "success" : r.review_status === "rejected" ? "danger" : "warning"}>
                    {r.review_status === "passed" ? "검토 통과" : r.review_status === "rejected" ? "검토 반려" : "검토 대기"}
                    {reviewer ? ` · ${reviewer.name}` : ""}
                  </Badge>
                </div>
                <p className="text-sm">{out.summary}</p>
                <ul className="grid gap-2">
                  {(out.findings ?? []).map((f, i) => (
                    <li key={i} className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{f.title}</p>
                        <ScorePill value={f.importance} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{f.summary}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {f.is_speculation ? <Badge variant="warning">AI 추측</Badge> : <Badge variant="success">출처 기반</Badge>}
                        {f.developer_try_worthy ? <Badge variant="secondary">써볼 가치 있음</Badge> : null}
                        {f.source_urls.slice(0, 3).map((u) => (
                          <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow" className="max-w-56 truncate text-xs text-primary hover:underline">
                            {u.replace(/^https:\/\//, "")}
                          </a>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
                {r.review_notes ? <p className="text-xs whitespace-pre-line text-muted-foreground">검토 의견: {r.review_notes}</p> : null}
                {out.insights?.length ? (
                  <div className="text-sm">
                    <p className="text-xs font-semibold text-muted-foreground">인사이트 (해석)</p>
                    <ul className="list-disc pl-4">
                      {out.insights.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="🔍" title="아직 리서치 결과가 없습니다">
          오늘 업무를 실행하면 리서처들이 웹을 조사한 결과가 여기에 쌓입니다.
        </EmptyState>
      )}

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Sources</h2>
        {sources?.length ? (
          <ul className="divide-y rounded-xl border bg-card">
            {sources.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 flex-1 truncate hover:underline">
                  {s.title}
                </a>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {s.publisher ?? new URL(s.url).hostname} · {s.source_type} · 발행 {formatDate(s.published_at)}
                  {s.is_verified ? <Badge variant="success">검색 확인</Badge> : <Badge variant="outline">미확인</Badge>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">수집된 출처가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
