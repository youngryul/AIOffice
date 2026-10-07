import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompany } from "@/lib/services/session";
import { OPPORTUNITY_STATUS_LABELS } from "@/lib/labels";
import { OPPORTUNITY_STATUSES } from "@/lib/types/domain";
import { StatusSelect } from "@/components/app/status-select";
import { formatDate } from "@/lib/utils";
import { setOpportunityStatus } from "../actions";

export const metadata: Metadata = { title: "사업 기회" };

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, companyId } = await requireCompany();
  const { data: o } = await supabase
    .from("opportunities")
    .select("*, trends(id, name), employees:created_by(name, avatar)")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!o) notFound();
  const trend = o.trends as { id: string; name: string } | null;
  const author = o.employees as { name: string; avatar: string } | null;

  const fields = [
    ["Trend", o.trend],
    ["Problem", o.problem],
    ["Target User", o.target_user],
    ["Solution", o.solution],
    ["Product Idea", o.product_idea],
    ["Market", o.market],
    ["Competition", o.competition],
    ["Business Model", o.business_model],
    ["Development Difficulty", o.difficulty],
    ["Estimated Development Time", o.development_time],
  ] as const;

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border bg-card p-5">
        <Link href="/opportunities" className="text-xs text-muted-foreground hover:text-foreground">
          ← Opportunity Board
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{o.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {author ? `${author.avatar} ${author.name} · ` : ""}
              {formatDate(o.created_at)}
              {trend ? (
                <>
                  {" · 근거 트렌드 "}
                  <Link href={`/trends/${trend.id}`} className="text-primary hover:underline">
                    {trend.name}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusSelect
              label="상태 변경"
              value={o.status}
              options={OPPORTUNITY_STATUSES.map((s) => ({ value: s, label: OPPORTUNITY_STATUS_LABELS[s] }))}
              action={setOpportunityStatus.bind(null, o.id)}
            />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Opportunity Score</p>
              <p className="text-4xl font-bold tabular-nums">{o.opportunity_score}</p>
            </div>
          </div>
        </div>
      </div>
      <dl className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
        {fields.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-sm whitespace-pre-line">{v ?? "-"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
