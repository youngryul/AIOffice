import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { PLATFORM_LABELS } from "@/lib/labels";
import { dateInTz } from "@/lib/time";
import type { Platform } from "@/lib/types/domain";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Content Calendar" };

const PLATFORM_TONE: Record<Platform, string> = {
  instagram: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
  threads: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  blog: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  reels: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
};

export default async function ContentCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const { supabase, companyId, settings } = await requireCompany();
  const today = dateInTz(new Date(), settings.timezone);
  const ym = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : today.slice(0, 7);
  const [year, mon] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const startPad = first.getUTCDay();
  const prev = new Date(Date.UTC(year, mon - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(year, mon, 1)).toISOString().slice(0, 7);

  const { data: items } = await supabase
    .from("content_ideas")
    .select("id, title, platform, status, scheduled_for")
    .eq("company_id", companyId)
    .gte("scheduled_for", `${ym}-01`)
    .lte("scheduled_for", `${ym}-${String(daysInMonth).padStart(2, "0")}`);
  const { data: unscheduled } = await supabase
    .from("content_ideas")
    .select("id, title, platform, total_score")
    .eq("company_id", companyId)
    .is("scheduled_for", null)
    .in("status", ["IDEA", "WRITING", "DESIGN", "CEO_REVIEW"])
    .order("total_score", { ascending: false })
    .limit(10);

  const cells = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Content Calendar"
        description="콘텐츠 상세 화면에서 발행 예정일을 지정하면 캘린더에 표시됩니다."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/content/calendar?month=${prev}`}>← 이전 달</Link>
            </Button>
            <span className="self-center px-2 font-semibold tabular-nums">{ym}</span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/content/calendar?month=${next}`}>다음 달 →</Link>
            </Button>
          </>
        }
      />
      <div className="overflow-x-auto">
        <div className="grid min-w-[700px] grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="bg-muted px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const date = day ? `${ym}-${String(day).padStart(2, "0")}` : null;
            const dayItems = (items ?? []).filter((it) => it.scheduled_for === date);
            return (
              <div key={i} className={cn("min-h-24 bg-card p-1.5", date === today && "ring-2 ring-inset ring-primary")}>
                {day ? <p className="mb-1 text-xs text-muted-foreground tabular-nums">{day}</p> : null}
                <ul className="grid gap-1">
                  {dayItems.map((it) => (
                    <li key={it.id}>
                      <Link href={`/content/${it.id}`} className={cn("block truncate rounded px-1.5 py-0.5 text-[11px]", PLATFORM_TONE[it.platform as Platform])} title={it.title}>
                        {PLATFORM_LABELS[it.platform as Platform]} · {it.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">일정 미지정 콘텐츠 (점수 순)</h2>
        {unscheduled?.length ? (
          <ul className="grid gap-1 text-sm">
            {unscheduled.map((u) => (
              <li key={u.id}>
                <Link href={`/content/${u.id}`} className="hover:underline">
                  [{PLATFORM_LABELS[u.platform as Platform]}] {u.title} ({u.total_score})
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">없음</p>
        )}
      </section>
    </div>
  );
}
