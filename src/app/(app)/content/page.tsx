import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { CONTENT_STATUS_LABELS, PLATFORM_LABELS } from "@/lib/labels";
import { CONTENT_STATUSES, PLATFORMS, type Platform } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, ScorePill } from "@/components/ui/misc";
import { StatusSelect } from "@/components/app/status-select";
import { formatDate } from "@/lib/utils";
import { setContentStatus } from "./actions";

export const metadata: Metadata = { title: "Content Factory" };

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const { platform } = await searchParams;
  const { supabase, companyId } = await requireCompany();
  const pf = PLATFORMS.includes(platform as Platform) ? (platform as Platform) : null;
  let q = supabase.from("content_ideas").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).order("total_score", { ascending: false }).limit(120);
  if (pf) q = q.eq("platform", pf);
  const { data: ideas } = await q;

  // Trend → Angle → 채널 별 콘텐츠 로 묶어서 보여준다
  const groups = new Map<string, NonNullable<typeof ideas>>();
  for (const idea of ideas ?? []) {
    const key = `${idea.trend ?? "기타"}::${idea.angle ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), idea]);
  }
  const options = CONTENT_STATUSES.map((s) => ({ value: s, label: CONTENT_STATUS_LABELS[s] }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Content Factory"
        description="Trend → Angle → Instagram / Threads / Blog / Reels. 점수 = Trend · Originality · Audience Fit · Save · Share · Brand Fit (각 20점, 100점 환산)"
        actions={
          <Button asChild variant="outline">
            <Link href="/content/calendar">Content Calendar</Link>
          </Button>
        }
      />
      <nav className="flex flex-wrap gap-1.5" aria-label="플랫폼">
        <Link href="/content" className={`rounded-full border px-3 py-1 text-xs ${!pf ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
          전체
        </Link>
        {PLATFORMS.map((p) => (
          <Link key={p} href={`/content?platform=${p}`} className={`rounded-full border px-3 py-1 text-xs ${pf === p ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            {PLATFORM_LABELS[p]}
          </Link>
        ))}
      </nav>
      {groups.size ? (
        [...groups.entries()].map(([key, items]) => {
          const [trend, angle] = key.split("::");
          return (
            <section key={key} className="grid gap-3 rounded-xl border bg-card p-4">
              <div>
                <p className="text-xs text-muted-foreground">Trend</p>
                <h2 className="font-semibold">{trend}</h2>
                {angle ? <p className="text-sm text-muted-foreground">Angle: {angle}</p> : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {items.map((c) => (
                  <article key={c.id} className="grid content-start gap-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{PLATFORM_LABELS[c.platform as Platform]}</Badge>
                      <ScorePill value={c.total_score} />
                    </div>
                    <Link href={`/content/${c.id}`} className="text-sm font-medium hover:underline">
                      {c.title}
                    </Link>
                    {c.hook ? <p className="line-clamp-2 text-xs text-muted-foreground">“{c.hook}”</p> : null}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{c.scheduled_for ? `📅 ${formatDate(c.scheduled_for)}` : ""}</span>
                      <StatusSelect label="상태" value={c.status} options={options} action={setContentStatus.bind(null, c.id)} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <EmptyState icon="✍️" title="콘텐츠 아이디어가 없습니다">
          콘텐츠 기획자가 오늘의 트렌드를 여러 채널 콘텐츠로 변환합니다.
        </EmptyState>
      )}
    </div>
  );
}
