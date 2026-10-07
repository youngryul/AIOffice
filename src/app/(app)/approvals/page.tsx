import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { APPROVAL_STATUS_LABELS } from "@/lib/labels";
import type { ApprovalStatus } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";
import { DecisionPanel } from "./decision-panel";

export const metadata: Metadata = { title: "CEO 결재" };

const RELATED_HREF: Record<string, string> = { opportunity: "/opportunities", content_idea: "/content", trend: "/trends" };

export default async function ApprovalsPage() {
  const { supabase, companyId } = await requireCompany();
  const [{ data: pending }, { data: decided }] = await Promise.all([
    supabase.from("approvals").select("*, employees(name, avatar)").eq("company_id", companyId).eq("status", "PENDING").order("created_at", { ascending: false }),
    supabase.from("approvals").select("*, employees(name, avatar)").eq("company_id", companyId).neq("status", "PENDING").order("decided_at", { ascending: false }).limit(30),
  ]);

  return (
    <div className="grid gap-8">
      <PageHeader title="CEO Approval Queue" description="Executive / 비서실장이 올린 결재 안건입니다. 결정과 이유는 회사 기억에 저장되어 다음 판단에 반영됩니다." />
      <section className="grid gap-4">
        {pending?.length ? (
          pending.map((a) => {
            const owner = a.employees as { name: string; avatar: string } | null;
            const alternatives = (a.alternatives as string[] | null) ?? [];
            return (
              <article key={a.id} id={a.id} className="grid scroll-mt-20 gap-3 rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="warning">{a.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {owner ? `${owner.avatar} ${owner.name} 제출` : ""} · {formatDateTime(a.created_at)}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold">{a.title}</h2>
                  </div>
                  {a.related_entity_type && a.related_entity_id && RELATED_HREF[a.related_entity_type] ? (
                    <Link href={`${RELATED_HREF[a.related_entity_type]}/${a.related_entity_id}`} className="text-sm text-primary hover:underline">
                      관련 자료 보기 →
                    </Link>
                  ) : null}
                </div>
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  {(
                    [
                      ["요약", a.summary],
                      ["이유", a.reason],
                      ["영향", a.impact],
                      ["추천안", a.recommendation],
                      ["비용", a.cost],
                    ] as const
                  ).map(([k, v]) =>
                    v ? (
                      <div key={k}>
                        <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
                        <dd className="mt-0.5">{v}</dd>
                      </div>
                    ) : null,
                  )}
                  {alternatives.length ? (
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">대안</dt>
                      <dd className="mt-0.5">
                        <ul className="list-disc pl-4">
                          {alternatives.map((alt, i) => (
                            <li key={i}>{alt}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <DecisionPanel approvalId={a.id} />
              </article>
            );
          })
        ) : (
          <EmptyState icon="🎉" title="대기 중인 결재가 없습니다">
            업무 사이클이 끝나면 비서실장이 결재 안건을 올립니다.
          </EmptyState>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">최근 결정</h2>
        {decided?.length ? (
          <ul className="divide-y rounded-xl border bg-card">
            {decided.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[a.feedback_tags.join(", "), a.decision_note].filter(Boolean).join(" — ") || "피드백 없음"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.status === "APPROVED" ? "success" : a.status === "REJECTED" ? "danger" : "secondary"}>
                    {APPROVAL_STATUS_LABELS[a.status as ApprovalStatus]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.decided_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">아직 결정한 안건이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
