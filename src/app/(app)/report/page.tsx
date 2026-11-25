import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { APPROVAL_STATUS_LABELS, STAGE_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import type { ApprovalStatus, TaskStatus, WorkflowStage } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { PrintButton } from "./print-button";
import { cn, formatDate, formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "일일 보고서" };

const MEETING_LABEL: Record<string, string> = { morning: "아침 회의", team: "팀 회의", executive: "임원 회의", project: "프로젝트 회의" };
const RUN_STATUS_LABEL: Record<string, string> = { running: "진행 중", completed: "완료", failed: "실패", cancelled: "취소" };

interface MinutesArgument {
  participant: string;
  argument: string;
}
interface ActionItem {
  owner: string;
  item: string;
}

function Block({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("grid content-start gap-2 break-inside-avoid rounded-xl border bg-card p-4 print:rounded-none print:border-x-0 print:border-t-0 print:p-2", className)}>
      <h2 className="text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}

function duration(start: string, end: string | null) {
  if (!end) return "-";
  const min = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}시간 ${min % 60}분` : `${min}분`;
}

/** CEO 일일 보고서 — 하루 업무를 A4 한 장으로. 저장된 데이터만 조립하므로 AI 비용이 들지 않는다. */
export default async function ReportPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const { run: runParam } = await searchParams;
  const { supabase, companyId, company } = await requireCompany();

  const { data: runs } = await supabase
    .from("aio_workday_runs")
    .select("id, run_date, status, stage, mode, started_at, completed_at, error, stage_log")
    .eq("company_id", companyId)
    .order("started_at", { ascending: false })
    .limit(14);
  const run = runs?.find((r) => r.id === runParam) ?? runs?.[0];

  if (!run) {
    return (
      <div className="grid gap-6">
        <PageHeader title="일일 보고서" description="하루 업무를 한 장으로 정리한 CEO 보고서입니다." />
        <EmptyState icon="📄" title="아직 업무 기록이 없습니다">
          오늘 업무를 실행하면 하루가 끝날 때 보고서가 만들어집니다.
        </EmptyState>
      </div>
    );
  }

  const [{ data: brief }, { data: tasks }, { data: meetings }, { data: approvals }, { data: usage }, { data: trends }, { data: opps }, { data: contents }, { data: staff }] = await Promise.all([
    supabase.from("aio_daily_briefs").select("executive_summary, important_decisions").eq("company_id", companyId).eq("run_id", run.id).maybeSingle(),
    supabase.from("aio_tasks").select("id, title, status, department, last_error, assigned_employee").eq("company_id", companyId).eq("run_id", run.id).order("created_at"),
    supabase.from("aio_meetings").select("id, type, topic, rounds, started_at, minutes:aio_meeting_minutes(decision, consensus, disagreements, action_items, arguments, ceo_approval_required)").eq("company_id", companyId).eq("run_id", run.id).order("started_at"),
    supabase.from("aio_approvals").select("id, title, summary, recommendation, status").eq("company_id", companyId).eq("run_id", run.id).order("created_at"),
    supabase.from("aio_ai_usage").select("estimated_cost").eq("company_id", companyId).eq("run_id", run.id),
    supabase.from("aio_trends").select("id, name, current_score").eq("company_id", companyId).eq("run_id", run.id).order("current_score", { ascending: false }).limit(3),
    supabase.from("aio_opportunities").select("id, title, opportunity_score").eq("company_id", companyId).eq("run_id", run.id).order("opportunity_score", { ascending: false }).limit(3),
    supabase.from("aio_content_ideas").select("id, title, platform, total_score").eq("company_id", companyId).eq("run_id", run.id).order("total_score", { ascending: false }).limit(3),
    supabase.from("aio_employees").select("id, name").eq("company_id", companyId),
  ]);
  const nameOf = new Map((staff ?? []).map((e) => [e.id, e.name]));

  const taskRows = tasks ?? [];
  const done = taskRows.filter((t) => ["DONE", "APPROVAL", "APPROVED"].includes(t.status)).length;
  const failed = taskRows.filter((t) => t.status === "FAILED");
  const cost = (usage ?? []).reduce((s, u) => s + Number(u.estimated_cost), 0);
  const stageLog = (run.stage_log as unknown as { stage: WorkflowStage; status: string; error?: string }[] | null) ?? [];
  const stageFailures = stageLog.filter((s) => s.status === "failed");
  const pending = (approvals ?? []).filter((a) => a.status === "PENDING");

  // 직원별 업무 묶음
  const byEmployee = new Map<string, typeof taskRows>();
  for (const t of taskRows) {
    const key = (t.assigned_employee && nameOf.get(t.assigned_employee)) || "미배정";
    byEmployee.set(key, [...(byEmployee.get(key) ?? []), t]);
  }

  return (
    <div className="grid gap-4 print:gap-2 print:text-[11px]">
      <div className="print:hidden">
        <PageHeader
          title="일일 보고서"
          description="하루 업무를 한 장으로 정리했습니다. 무엇을 했고, 어떤 이야기가 오갔고, 결과가 무엇인지 이 문서만 보면 됩니다."
          actions={<PrintButton />}
        />
        {runs && runs.length > 1 ? (
          <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="날짜 선택">
            {runs.map((r) => (
              <Link
                key={r.id}
                href={`/report?run=${r.id}`}
                className={cn("rounded-full border px-3 py-1 text-xs", r.id === run.id ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
              >
                {formatDate(r.run_date)}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      <header className="rounded-2xl border bg-gradient-to-br from-accent/70 to-card p-5 print:rounded-none print:p-2">
        <p className="text-xs text-muted-foreground">
          {company.name} · {formatDate(run.run_date, { year: "numeric", month: "long", day: "numeric", weekday: "short" })} 일일 업무 보고서
        </p>
        <p className="mt-2 text-base font-semibold leading-relaxed whitespace-pre-line">
          {brief?.executive_summary ?? (run.status === "running" ? "아직 업무가 진행 중입니다. CEO 보고 단계가 끝나면 요약이 채워집니다." : "요약이 만들어지지 않았습니다.")}
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <div>
            상태 <b className="text-foreground">{RUN_STATUS_LABEL[run.status] ?? run.status}</b>
            {run.status === "running" ? ` (${STAGE_LABELS[run.stage as WorkflowStage]})` : ""}
          </div>
          <div>
            업무 <b className="text-foreground">{done}/{taskRows.length}</b> 완료
          </div>
          <div>
            회의 <b className="text-foreground">{meetings?.length ?? 0}</b>회
          </div>
          <div>
            소요 <b className="text-foreground">{duration(run.started_at, run.completed_at)}</b>
          </div>
          <div>
            AI 비용 <b className="text-foreground">{formatUsd(cost, 4)}</b>
          </div>
        </dl>
      </header>

      {pending.length ? (
        <Block title={`🔔 CEO 결재 필요 (${pending.length}건)`} className="border-amber-400/60">
          <ul className="grid gap-1.5 text-sm">
            {pending.map((a) => (
              <li key={a.id}>
                <Link href={`/approvals#${a.id}`} className="font-medium hover:underline">
                  {a.title}
                </Link>
                {a.recommendation ? <span className="text-xs text-muted-foreground"> — 추천: {a.recommendation}</span> : null}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <div className="grid gap-4 print:gap-2 md:grid-cols-2">
        <Block title="🧑‍💼 오늘 한 일 (직원별)">
          {byEmployee.size ? (
            <ul className="grid gap-2 text-sm">
              {[...byEmployee.entries()].map(([name, list]) => (
                <li key={name}>
                  <p className="font-medium">{name}</p>
                  <ul className="ml-3 list-disc text-xs text-muted-foreground">
                    {list.map((t) => (
                      <li key={t.id}>
                        {t.title} <Badge variant={t.status === "FAILED" ? "danger" : "outline"}>{TASK_STATUS_LABELS[t.status as TaskStatus] ?? t.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">기록된 업무가 없습니다.</p>
          )}
        </Block>

        <Block title="🏆 오늘의 결과물">
          <div className="grid gap-2 text-sm">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">트렌드</p>
              {trends?.length ? trends.map((t) => <p key={t.id}>· {t.name} <span className="text-xs text-muted-foreground">({t.current_score}점)</span></p>) : <p className="text-xs text-muted-foreground">없음</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">사업 기회</p>
              {opps?.length ? opps.map((o) => <p key={o.id}>· {o.title} <span className="text-xs text-muted-foreground">({o.opportunity_score}점)</span></p>) : <p className="text-xs text-muted-foreground">없음</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">콘텐츠</p>
              {contents?.length ? contents.map((c) => <p key={c.id}>· [{c.platform}] {c.title} <span className="text-xs text-muted-foreground">({c.total_score}점)</span></p>) : <p className="text-xs text-muted-foreground">없음</p>}
            </div>
          </div>
        </Block>
      </div>

      <Block title="💬 회의에서 오간 이야기">
        {meetings?.length ? (
          <ul className="grid gap-3 text-sm">
            {meetings.map((m) => {
              const mm = (Array.isArray(m.minutes) ? m.minutes[0] : m.minutes) as {
                decision: string | null;
                consensus: string | null;
                disagreements: string[];
                action_items: ActionItem[];
                arguments: MinutesArgument[];
                ceo_approval_required: boolean;
              } | null;
              return (
                <li key={m.id} className="grid gap-1 break-inside-avoid">
                  <p className="font-medium">
                    <Badge>{MEETING_LABEL[m.type] ?? m.type}</Badge> {m.topic}
                  </p>
                  {mm ? (
                    <div className="ml-1 grid gap-0.5 text-xs">
                      {mm.arguments?.slice(0, 3).map((a, i) => (
                        <p key={i} className="text-muted-foreground">
                          <b className="text-foreground">{a.participant}</b>: {a.argument}
                        </p>
                      ))}
                      {mm.disagreements?.length ? <p className="text-rose-700 dark:text-rose-300">⚠ 이견: {mm.disagreements.join(" / ")}</p> : null}
                      {mm.consensus ? <p>🤝 합의: {mm.consensus}</p> : null}
                      {mm.decision ? <p className="font-semibold">✅ 결론: {mm.decision}</p> : null}
                      {mm.action_items?.length ? <p className="text-muted-foreground">▶ 할 일: {mm.action_items.map((a) => `${a.owner} - ${a.item}`).join(" · ")}</p> : null}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">회의록이 아직 없습니다.</p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">진행된 회의가 없습니다.</p>
        )}
      </Block>

      {failed.length || stageFailures.length || run.error ? (
        <Block title="⚠️ 문제와 확인할 점" className="border-rose-400/60">
          <ul className="grid gap-1 text-xs">
            {stageFailures.map((s, i) => (
              <li key={i}>
                <b>{STAGE_LABELS[s.stage]}</b> 단계 실패: {s.error}
              </li>
            ))}
            {failed.map((t) => (
              <li key={t.id}>
                업무 실패 — {t.title}
                {t.last_error ? `: ${t.last_error}` : ""}
              </li>
            ))}
            {run.error && !stageFailures.length ? <li>{run.error}</li> : null}
          </ul>
        </Block>
      ) : null}

      {(approvals ?? []).some((a) => a.status !== "PENDING") ? (
        <Block title="📨 결재 처리 현황">
          <ul className="grid gap-1 text-xs">
            {(approvals ?? []).map((a) => (
              <li key={a.id}>
                {a.title} <Badge variant="outline">{APPROVAL_STATUS_LABELS[a.status as ApprovalStatus] ?? a.status}</Badge>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
    </div>
  );
}
