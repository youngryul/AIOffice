import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { OPPORTUNITY_STATUS_LABELS } from "@/lib/labels";
import { OPPORTUNITY_STATUSES, type OpportunityStatus } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, ScorePill } from "@/components/ui/misc";
import { StatusSelect } from "@/components/app/status-select";
import { setOpportunityStatus } from "./actions";

export const metadata: Metadata = { title: "Opportunity Board" };

const DIFFICULTY = { low: "쉬움", medium: "보통", high: "어려움" } as const;

export default async function OpportunitiesPage() {
  const { supabase, companyId } = await requireCompany();
  const { data: opps } = await supabase.from("opportunities").select("*").eq("company_id", companyId).order("opportunity_score", { ascending: false }).limit(200);
  const options = OPPORTUNITY_STATUSES.map((s) => ({ value: s, label: OPPORTUNITY_STATUS_LABELS[s] }));

  return (
    <div className="grid gap-6">
      <PageHeader title="Opportunity Board" description="AI 가 발견한 사업 아이디어. 상태를 바꿔 검증 단계를 관리하세요." />
      {opps?.length ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {OPPORTUNITY_STATUSES.map((status) => {
            const items = opps.filter((o) => o.status === status);
            return (
              <section key={status} className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/50 p-2" aria-label={status}>
                <h2 className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground uppercase">
                  {OPPORTUNITY_STATUS_LABELS[status as OpportunityStatus]}
                  <span>{items.length}</span>
                </h2>
                {items.map((o) => (
                  <article key={o.id} className="grid gap-2 rounded-lg border bg-card p-3 text-sm shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/opportunities/${o.id}`} className="font-medium hover:underline">
                        {o.title}
                      </Link>
                      <ScorePill value={o.opportunity_score} />
                    </div>
                    <dl className="grid gap-1 text-xs">
                      <div>
                        <dt className="inline font-semibold">Problem </dt>
                        <dd className="inline text-muted-foreground">{o.problem}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold">Target </dt>
                        <dd className="inline text-muted-foreground">{o.target_user}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold">Model </dt>
                        <dd className="inline text-muted-foreground">{o.business_model}</dd>
                      </div>
                    </dl>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        <Badge variant="outline">{DIFFICULTY[o.difficulty as keyof typeof DIFFICULTY]}</Badge>
                        {o.development_time ? <Badge variant="secondary">{o.development_time}</Badge> : null}
                      </div>
                      <StatusSelect label="상태 변경" value={o.status} options={options} action={setOpportunityStatus.bind(null, o.id)} />
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="💡" title="아직 사업 아이디어가 없습니다">
          사업기회 분석가가 오늘의 트렌드를 바탕으로 아이디어를 발굴합니다.
        </EmptyState>
      )}
    </div>
  );
}
