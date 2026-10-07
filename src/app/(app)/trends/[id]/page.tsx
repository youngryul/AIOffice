import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompany } from "@/lib/services/session";
import { TREND_CATEGORY_LABELS, PLATFORM_LABELS } from "@/lib/labels";
import type { Platform, TrendCategory } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { ScoreBar, ScorePill } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "트렌드 상세" };

export default async function TrendDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, companyId } = await requireCompany();
  const { data: t } = await supabase.from("trends").select("*, employees:discovered_by(name, avatar)").eq("id", id).eq("company_id", companyId).maybeSingle();
  if (!t) notFound();

  const [{ data: links }, { data: opps }, { data: contents }, { data: history }] = await Promise.all([
    supabase.from("trend_sources").select("sources(*)").eq("trend_id", id).eq("company_id", companyId),
    supabase.from("opportunities").select("id, title, opportunity_score, status").eq("company_id", companyId).eq("trend_id", id),
    supabase.from("content_ideas").select("id, title, platform, total_score").eq("company_id", companyId).eq("trend_id", id),
    supabase.from("trend_snapshots").select("snapshot_date, current_score, mention_count").eq("trend_id", id).eq("company_id", companyId).order("snapshot_date", { ascending: false }).limit(30),
  ]);
  const sources = (links ?? []).map((l) => l.sources).filter((s): s is NonNullable<typeof s> => s !== null);
  const discoverer = t.employees as { name: string; avatar: string } | null;

  const scores = [
    ["Novelty", t.novelty],
    ["Growth", t.growth_score],
    ["Business", t.business_score],
    ["Developer", t.developer_score],
    ["Content", t.content_score],
    ["Importance", t.importance],
    ["실무 활용도", t.practical_value],
  ] as const;

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border bg-card p-5">
        <Link href="/trends" className="text-xs text-muted-foreground hover:text-foreground">
          ← Trend Radar
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline">{TREND_CATEGORY_LABELS[t.category as TrendCategory]}</Badge>
              {t.fact_check_status === "verified" ? <Badge variant="success">팩트체크 통과 · 검증된 출처</Badge> : <Badge variant="warning">출처 미검증</Badge>}
              <Badge variant="secondary">언급 {t.mention_count}회</Badge>
              {discoverer ? (
                <Badge variant="secondary">
                  {discoverer.avatar} {discoverer.name} 발견
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Trend Score</p>
            <p className="text-4xl font-bold tabular-nums">{t.current_score}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed">{t.summary}</p>
        {t.try_worthy ? <p className="mt-3 rounded-lg bg-accent/60 p-3 text-sm">🧪 직접 써볼 가치: {t.try_reason}</p> : null}
        <p className="mt-3 text-xs text-muted-foreground">
          처음 발견 {formatDate(t.first_seen_at)} · 최근 {formatDate(t.last_seen_at)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="grid content-start gap-2 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">점수</h2>
          {scores.map(([label, v]) => (
            <div key={label} className="grid gap-1">
              <div className="flex justify-between text-xs">
                <span>{label}</span>
                <span className="tabular-nums">{v}</span>
              </div>
              <ScoreBar value={v} />
            </div>
          ))}
        </section>
        <section className="grid content-start gap-2 rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">출처 (Source)</h2>
          {sources.length ? (
            <ul className="grid gap-2">
              {sources.map((s) => (
                <li key={s.id} className="text-sm">
                  <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium hover:underline">
                    {s.title}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {s.publisher ?? new URL(s.url).hostname} · 발행 {formatDate(s.published_at)} · 수집 {formatDate(s.retrieved_at)} · {s.is_verified ? "검색 확인됨" : "미확인"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">연결된 출처가 없습니다.</p>
          )}
          {t.fact_check_notes ? <p className="mt-2 text-xs text-muted-foreground">팩트체크 메모: {t.fact_check_notes}</p> : null}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">관련 사업 기회</h2>
          {opps?.length ? (
            <ul className="grid gap-1.5">
              {opps.map((o) => (
                <li key={o.id} className="flex justify-between gap-2 text-sm">
                  <Link href={`/opportunities/${o.id}`} className="hover:underline">
                    {o.title}
                  </Link>
                  <ScorePill value={o.opportunity_score} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">없음</p>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">관련 콘텐츠</h2>
          {contents?.length ? (
            <ul className="grid gap-1.5">
              {contents.map((c) => (
                <li key={c.id} className="flex justify-between gap-2 text-sm">
                  <Link href={`/content/${c.id}`} className="hover:underline">
                    [{PLATFORM_LABELS[c.platform as Platform]}] {c.title}
                  </Link>
                  <ScorePill value={c.total_score} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">없음</p>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">점수 기록</h2>
          {history?.length ? (
            <ul className="grid gap-1.5">
              {history.map((h) => (
                <li key={h.snapshot_date} className="grid grid-cols-[5rem_1fr_2rem] items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{formatDate(h.snapshot_date)}</span>
                  <ScoreBar value={h.current_score} />
                  <span className="text-right tabular-nums">{h.current_score}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">기록 없음</p>
          )}
        </section>
      </div>
    </div>
  );
}
