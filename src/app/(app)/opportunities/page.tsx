import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { OPPORTUNITY_STATUS_LABELS } from "@/lib/labels";
import { OPPORTUNITY_STATUSES, type OpportunityStatus } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, ScorePill } from "@/components/ui/misc";
import { StatusSelect } from "@/components/app/status-select";
import { setOpportunityStatus } from "./actions";

export const metadata: Metadata = { title: "사업 기회" };

const DIFFICULTY = { low: "쉬움", medium: "보통", high: "어려움" } as const;

export default async function OpportunitiesPage() {
  const { supabase, companyId } = await requireCompany();
  const { data: opps } = await supabase.from("aio_opportunities").select("*").eq("company_id", companyId).order("opportunity_score", { ascending: false }).limit(200);
  const options = OPPORTUNITY_STATUSES.map((s) => ({ value: s, label: OPPORTUNITY_STATUS_LABELS[s] }));

  return (
    <div className="grid gap-6">
      <PageHeader title="사업 기회" description="AI 가 발견한 사업 아이디어. 상태를 바꿔 검증 단계를 관리하세요." />
      {opps?.length ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {OPPORTUNITY_STATUSES.map((status) => {
            const items = opps.filter((o) => o.status === status);
            return (
              <section key={status} className="flex w-80 min-w-0 shrink-0 flex-col gap-3 rounded-xl bg-muted/50 p-2" aria-label={status}>
                <h2 className="flex items-center justify-between px-1 text-sm font-semibold text-muted-foreground">
                  {OPPORTUNITY_STATUS_LABELS[status as OpportunityStatus]}
                  <span>{items.length}</span>
                </h2>
                {items.map((o) => (
                  <article key={o.id} className="grid min-w-0 gap-3 rounded-lg border bg-card p-3 text-sm shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/opportunities/${o.id}`} className="min-w-0 font-medium leading-snug break-words hover:underline">
                        {o.title}
                      </Link>
                      <ScorePill value={o.opportunity_score} className="shrink-0" />
                    </div>
                    <dl className="grid gap-1.5 text-xs leading-relaxed">
                      <div>
                        <dt className="block font-semibold">문제</dt>
                        <dd className="line-clamp-3 break-words text-muted-foreground">{o.problem}</dd>
                      </div>
                      <div>
                        <dt className="block font-semibold">대상</dt>
                        <dd className="line-clamp-2 break-words text-muted-foreground">{o.target_user}</dd>
                      </div>
                      <div>
                        <dt className="block font-semibold">수익 모델</dt>
                        <dd className="line-clamp-2 break-words text-muted-foreground">{o.business_model}</dd>
                      </div>
                    </dl>
                    {o.development_time ? <p className="line-clamp-2 text-xs break-words text-muted-foreground">⏱ {o.development_time}</p> : null}
                    <div className="flex items-center justify-between gap-2 border-t pt-2">
                      <Badge variant="outline">난이도 {DIFFICULTY[o.difficulty as keyof typeof DIFFICULTY]}</Badge>
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
