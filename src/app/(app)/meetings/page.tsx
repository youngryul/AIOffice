import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "회의" };

const TYPE_LABEL = { morning: "Morning Meeting", team: "Team Meeting", executive: "Executive Meeting", project: "Project Meeting" } as const;
const STANCE: Record<string, { label: string; tone: string }> = {
  opinion: { label: "의견", tone: "bg-muted" },
  agree: { label: "동의", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  disagree: { label: "반대", tone: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" },
  supplement: { label: "보완", tone: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  summary: { label: "배정", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
};

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const { supabase, companyId } = await requireCompany();
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, type, topic, status, rounds, started_at")
    .eq("company_id", companyId)
    .order("started_at", { ascending: false })
    .limit(40);
  const selectedId = id ?? meetings?.[0]?.id;

  const [{ data: minutes }, { data: messages }] = selectedId
    ? await Promise.all([
        supabase.from("meeting_minutes").select("*").eq("meeting_id", selectedId).eq("company_id", companyId).maybeSingle(),
        supabase.from("meeting_messages").select("*, employees(name, avatar)").eq("meeting_id", selectedId).eq("company_id", companyId).order("round").order("created_at"),
      ])
    : [{ data: null }, { data: null }];
  const selected = meetings?.find((m) => m.id === selectedId);

  return (
    <div className="grid gap-6">
      <PageHeader title="회의" description="각 직원이 자기 결과를 근거로 의견을 내고, 다른 의견에 동의 / 반대 / 보완합니다 (최대 2~3 Round)." />
      {meetings?.length ? (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <nav className="grid content-start gap-1" aria-label="회의 목록">
            {meetings.map((m) => (
              <Link
                key={m.id}
                href={`/meetings?id=${m.id}`}
                className={cn("rounded-lg border px-3 py-2 text-sm", m.id === selectedId ? "border-primary bg-accent" : "bg-card hover:bg-accent/50")}
              >
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABEL[m.type as keyof typeof TYPE_LABEL]} · {formatDateTime(m.started_at)}
                </p>
                <p className="line-clamp-2 font-medium">{m.topic}</p>
              </Link>
            ))}
          </nav>
          {selected ? (
            <div className="grid content-start gap-4">
              <section className="rounded-xl border bg-card p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge>{TYPE_LABEL[selected.type as keyof typeof TYPE_LABEL]}</Badge>
                  <Badge variant="outline">{selected.rounds} Round</Badge>
                  {minutes?.ceo_approval_required ? <Badge variant="warning">CEO 결재 필요</Badge> : null}
                </div>
                <h2 className="text-lg font-semibold">{selected.topic}</h2>
                {minutes ? (
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">Participants</dt>
                      <dd>{(minutes.participants as string[]).join(", ")}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">Discussion</dt>
                      <dd className="whitespace-pre-line">{minutes.discussion}</dd>
                    </div>
                    {(minutes.arguments as { participant: string; argument: string }[]).length ? (
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">Arguments</dt>
                        <dd>
                          <ul className="list-disc pl-4">
                            {(minutes.arguments as { participant: string; argument: string }[]).map((a, i) => (
                              <li key={i}>
                                <b>{a.participant}</b>: {a.argument}
                              </li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    ) : null}
                    {minutes.consensus ? (
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">Consensus</dt>
                        <dd>{minutes.consensus}</dd>
                      </div>
                    ) : null}
                    {(minutes.disagreements as string[]).length ? (
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">Disagreement</dt>
                        <dd>
                          <ul className="list-disc pl-4">
                            {(minutes.disagreements as string[]).map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">Decision</dt>
                      <dd className="font-medium">{minutes.decision ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">Action Items</dt>
                      <dd>
                        <ul className="list-disc pl-4">
                          {(minutes.action_items as { owner: string; item: string }[]).map((a, i) => (
                            <li key={i}>
                              <b>{a.owner}</b>: {a.item}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">회의가 진행 중입니다…</p>
                )}
              </section>
              <section className="rounded-xl border bg-card p-5">
                <h3 className="mb-3 text-sm font-semibold">발언 기록</h3>
                <ol className="grid gap-3">
                  {(messages ?? []).map((m) => {
                    const emp = m.employees as { name: string; avatar: string } | null;
                    const stance = STANCE[m.stance] ?? STANCE.opinion;
                    return (
                      <li key={m.id} className={cn("flex gap-3", m.reply_to && "pl-8")}>
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-lg" aria-hidden>
                          {emp?.avatar ?? "🤖"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-xs text-muted-foreground">
                            <b className="text-foreground">{emp?.name ?? "시스템"}</b> Round {m.round}
                            <span className={cn("rounded px-1.5 py-0.5 text-[10px]", stance.tone)}>{stance.label}</span>
                          </p>
                          <p className="mt-0.5 text-sm whitespace-pre-line">{m.content}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState icon="💬" title="아직 회의가 없습니다">
          업무 사이클이 시작되면 Morning Meeting 과 Executive Meeting 이 기록됩니다.
        </EmptyState>
      )}
    </div>
  );
}
