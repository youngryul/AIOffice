import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { Tables } from "@/lib/supabase/database.types";
import type { BriefItem, CompetitorMovement, ThingToTry } from "@/lib/types/domain";
import { ScorePill } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

type Brief = Tables<"daily_briefs">;
type Approval = Pick<Tables<"approvals">, "id" | "title" | "type" | "recommendation">;

function Section({ title, emoji, children, href }: { title: string; emoji: string; children: React.ReactNode; href?: string }) {
  return (
    <section className="grid content-start gap-2 rounded-xl border bg-card p-4">
      <h3 className="flex items-center justify-between text-sm font-semibold">
        <span>
          <span aria-hidden>{emoji}</span> {title}
        </span>
        {href ? (
          <Link href={href} className="text-xs font-normal text-muted-foreground hover:text-foreground">
            전체 보기 <ArrowRightIcon className="inline size-3" />
          </Link>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

function ItemList({ items, hrefBase, empty }: { items: BriefItem[]; hrefBase: string; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className="grid gap-2">
      {items.map((it, i) => (
        <li key={`${it.id}-${i}`}>
          <Link href={it.id ? `${hrefBase}/${it.id}` : hrefBase} className="group flex items-start gap-2 rounded-lg p-1 -m-1 hover:bg-accent/50">
            <span className="mt-0.5 w-4 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="text-sm font-medium group-hover:underline">{it.title}</span>
              {it.summary ? <span className="line-clamp-2 text-xs text-muted-foreground">{it.summary}</span> : null}
            </span>
            <ScorePill value={it.score} />
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** CEO Morning Brief — Dashboard 의 가장 중요한 화면 */
export function BriefView({ brief, approvals }: { brief: Brief | null; approvals: Approval[] }) {
  if (!brief) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
        <p className="text-3xl" aria-hidden>
          ☀️
        </p>
        <p className="mt-2 font-semibold">아직 오늘의 CEO Brief 가 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">아래의 &ldquo;오늘 업무 실행&rdquo; 을 누르면 AI 직원들이 조사 → 검토 → 회의 → 보고를 진행합니다.</p>
      </div>
    );
  }
  const ai = brief.ai_trends as unknown as BriefItem[];
  const vibe = brief.vibe_coding as unknown as BriefItem[];
  const opps = brief.opportunities as unknown as BriefItem[];
  const contents = brief.content_ideas as unknown as BriefItem[];
  const tries = brief.things_to_try as unknown as ThingToTry[];
  const comps = brief.competitor_movement as unknown as CompetitorMovement[];

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border bg-gradient-to-br from-accent/70 to-card p-5">
        <p className="text-xs font-medium text-muted-foreground">Today · {formatDate(brief.brief_date, { year: "numeric", month: "long", day: "numeric", weekday: "short" })}</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight">{brief.title}</h2>
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{brief.executive_summary}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Section title="AI Trend TOP 5" emoji="🔭" href="/trends">
          <ItemList items={ai} hrefBase="/trends" empty="검증된 AI 트렌드가 없습니다." />
        </Section>
        <Section title="Vibe Coding TOP 3" emoji="👩‍💻" href="/trends?category=vibe_coding">
          <ItemList items={vibe} hrefBase="/trends" empty="바이브코딩 소식이 없습니다." />
        </Section>
        <Section title="CEO Approval" emoji="📨" href="/approvals">
          {approvals.length ? (
            <ul className="grid gap-2">
              {approvals.map((a) => (
                <li key={a.id}>
                  <Link href={`/approvals#${a.id}`} className="block rounded-lg border p-2.5 hover:bg-accent/50">
                    <p className="text-sm font-medium">{a.title}</p>
                    {a.recommendation ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">추천: {a.recommendation}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">대기 중인 결재가 없습니다. 🎉</p>
          )}
        </Section>
        <Section title="Business Opportunity TOP 3" emoji="💼" href="/opportunities">
          <ItemList items={opps} hrefBase="/opportunities" empty="오늘 발굴된 사업 기회가 없습니다." />
        </Section>
        <Section title="Content Idea TOP 5" emoji="✍️" href="/content">
          <ItemList items={contents} hrefBase="/content" empty="콘텐츠 아이디어가 없습니다." />
        </Section>
        <Section title="Things To Try" emoji="🧪">
          {tries.length ? (
            <ol className="grid gap-2">
              {tries.map((t, i) => (
                <li key={i} className="grid gap-0.5">
                  {t.trend_id ? (
                    <Link href={`/trends/${t.trend_id}`} className="text-sm font-medium hover:underline">
                      {i + 1}. {t.title}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">
                      {i + 1}. {t.title}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">왜: {t.why}</span>
                  <span className="text-xs text-muted-foreground">방법: {t.how}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">추천 항목이 없습니다.</p>
          )}
        </Section>
        <Section title="Competitor Movement" emoji="🏁">
          {comps.length ? (
            <ul className="grid gap-2">
              {comps.map((c, i) => (
                <li key={i} className="text-sm">
                  <b>{c.name}</b> — {c.movement}
                  <p className="text-xs text-muted-foreground">→ {c.implication}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">특이 동향 없음</p>
          )}
        </Section>
      </div>
    </div>
  );
}
