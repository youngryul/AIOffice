import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { TREND_CATEGORY_LABELS } from "@/lib/labels";
import { TREND_WEIGHTS } from "@/lib/agents/scoring";
import { addDays, dateInTz } from "@/lib/time";
import { TREND_CATEGORIES, type TrendCategory } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, ScorePill } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Trend Radar" };

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <span className={cn("text-xs font-medium tabular-nums", value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-muted-foreground")}>
      {value > 0 ? "▲" : value < 0 ? "▼" : "■"} {Math.abs(value)}
    </span>
  );
}

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const { supabase, companyId, settings } = await requireCompany();
  const cat = TREND_CATEGORIES.includes(category as TrendCategory) ? (category as TrendCategory) : null;
  const today = dateInTz(new Date(), settings.timezone);

  let q = supabase.from("trends").select("*").eq("company_id", companyId).neq("status", "archived").order("current_score", { ascending: false }).limit(60);
  if (cat) q = q.eq("category", cat);
  const [{ data: trends }, { data: snapshots }] = await Promise.all([
    q,
    supabase.from("trend_snapshots").select("trend_id, snapshot_date, current_score").eq("company_id", companyId).gte("snapshot_date", addDays(today, -31)),
  ]);

  // 기준일 이전 가장 최근 스냅샷과 비교해 7일 / 30일 변화 계산
  const changeSince = (trendId: string, current: number, days: number) => {
    const cutoff = addDays(today, -days);
    const past = (snapshots ?? [])
      .filter((s) => s.trend_id === trendId && s.snapshot_date <= cutoff)
      .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))[0];
    return past ? current - past.current_score : null;
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Trend Radar"
        description={`Trend Score = Novelty ${TREND_WEIGHTS.novelty * 100}% · Growth ${TREND_WEIGHTS.growth * 100}% · Business ${TREND_WEIGHTS.business * 100}% · Developer ${TREND_WEIGHTS.developer * 100}% · Content ${TREND_WEIGHTS.content * 100}%`}
      />
      <nav className="flex flex-wrap gap-1.5" aria-label="카테고리">
        <Link href="/trends" className={`rounded-full border px-3 py-1 text-xs ${!cat ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
          전체
        </Link>
        {TREND_CATEGORIES.map((c) => (
          <Link key={c} href={`/trends?category=${c}`} className={`rounded-full border px-3 py-1 text-xs ${cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            {TREND_CATEGORY_LABELS[c]}
          </Link>
        ))}
      </nav>

      {trends?.length ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Trend</th>
                <th className="px-3 py-2 font-medium">Current</th>
                <th className="px-3 py-2 font-medium">7일</th>
                <th className="px-3 py-2 font-medium">30일</th>
                <th className="px-3 py-2 font-medium">Growth</th>
                <th className="px-3 py-2 font-medium">Mentions</th>
                <th className="px-3 py-2 font-medium">Business</th>
                <th className="px-3 py-2 font-medium">Content</th>
                <th className="px-3 py-2 font-medium">Developer</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {trends.map((t) => (
                <tr key={t.id}>
                  <td className="max-w-sm px-4 py-2.5">
                    <Link href={`/trends/${t.id}`} className="font-medium hover:underline">
                      {t.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline">{TREND_CATEGORY_LABELS[t.category as TrendCategory]}</Badge>
                      {t.fact_check_status === "verified" ? <Badge variant="success">검증됨</Badge> : <Badge variant="warning">미검증 출처</Badge>}
                      {t.try_worthy ? <Badge variant="secondary">🧪 써볼 가치</Badge> : null}
                      {t.status === "watching" ? <Badge>관심</Badge> : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <ScorePill value={t.current_score} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Delta value={changeSince(t.id, t.current_score, 7)} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Delta value={changeSince(t.id, t.current_score, 30)} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{t.growth_score}</td>
                  <td className="px-3 py-2.5 tabular-nums">{t.mention_count}</td>
                  <td className="px-3 py-2.5 tabular-nums">{t.business_score}</td>
                  <td className="px-3 py-2.5 tabular-nums">{t.content_score}</td>
                  <td className="px-3 py-2.5 tabular-nums">{t.developer_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="📡" title="등록된 트렌드가 없습니다">
          팩트체크를 통과한 리서치 결과만 트렌드로 등록됩니다.
        </EmptyState>
      )}
    </div>
  );
}
