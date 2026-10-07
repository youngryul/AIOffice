import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCompany } from "@/lib/services/session";
import { ROLE_CATALOG, DEPARTMENT_LABELS } from "@/lib/agents/roles";
import { POSITION_CONFIG, nextPosition } from "@/lib/agents/positions";
import { modelFor } from "@/lib/agents/agent";
import { resolveTools } from "@/lib/tools";
import { TOOL_LABELS } from "@/lib/tools/types";
import { EMPLOYEE_STATUS_META, TASK_STATUS_LABELS } from "@/lib/labels";
import { PROMOTION_RULES } from "@/lib/agents/scoring";
import type { Department, EmployeeStatus, Position, RoleKey, TaskStatus } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "@/components/ui/misc";
import { formatDateTime, formatUsd } from "@/lib/utils";
import { daysAgoIso, startOfDayInTz } from "@/lib/time";
import { fireEmployee, promoteEmployee } from "../actions";
import { EmployeeSettingsForm, RatingForm } from "./settings-form";

export const metadata: Metadata = { title: "직원 상세" };

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, companyId, settings } = await requireCompany();
  const { data: e } = await supabase.from("employees").select("*").eq("id", id).eq("company_id", companyId).maybeSingle();
  if (!e) notFound();

  const dayStart = startOfDayInTz(new Date(), settings.timezone).toISOString();
  const [{ data: tasks }, { data: perf }, { data: usageToday }, { data: usageMonth }] = await Promise.all([
    supabase.from("tasks").select("id, title, status, updated_at, last_error").eq("company_id", companyId).eq("assigned_employee", id).order("updated_at", { ascending: false }).limit(15),
    supabase.from("employee_performance").select("*").eq("company_id", companyId).eq("employee_id", id).order("period_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("ai_usage").select("input_tokens, output_tokens, estimated_cost").eq("company_id", companyId).eq("employee_id", id).gte("created_at", dayStart),
    supabase.from("ai_usage").select("estimated_cost").eq("company_id", companyId).eq("employee_id", id).gte("created_at", daysAgoIso(30)),
  ]);

  const role = ROLE_CATALOG[e.role as RoleKey];
  const position = e.position as Position;
  const cfg = POSITION_CONFIG[position];
  const next = nextPosition(position);
  const tools = resolveTools(e.role as RoleKey, position);
  const meta = EMPLOYEE_STATUS_META[e.status as EmployeeStatus];
  const tokensToday = (usageToday ?? []).reduce((s, u) => s + u.input_tokens + u.output_tokens, 0);
  const costToday = (usageToday ?? []).reduce((s, u) => s + Number(u.estimated_cost), 0);
  const costMonth = (usageMonth ?? []).reduce((s, u) => s + Number(u.estimated_cost), 0);

  const metrics = [
    ["Accuracy", perf?.accuracy ?? e.accuracy_score],
    ["CEO Approval Rate", perf?.approval_rate ?? e.approval_rate],
    ["Useful Insight", perf?.useful_insight ?? 0],
    ["Originality", perf?.originality ?? 0],
    ["Task Completion", perf?.task_completion ?? 0],
    ["Content Performance", perf?.content_performance ?? 0],
  ] as const;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-muted text-4xl" aria-hidden>
          {e.avatar}
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{e.name}</h1>
          <p className="text-sm text-muted-foreground">
            {role.title} · {DEPARTMENT_LABELS[e.department as Department]}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline">
              {cfg.label} (Lv.{cfg.level})
            </Badge>
            <span className={`rounded-md px-2 py-0.5 text-xs ${meta.tone}`}>
              {meta.emoji} {meta.label}
            </span>
            {!e.is_active ? <Badge variant="danger">퇴사</Badge> : null}
            {e.promotion_candidate ? <Badge variant="success">승진 후보</Badge> : null}
          </div>
        </div>
        {e.is_active ? (
          <div className="flex gap-2">
            {next ? (
              <form action={promoteEmployee.bind(null, e.id)}>
                <Button variant={e.promotion_candidate ? "default" : "outline"} size="sm">
                  {POSITION_CONFIG[next].label} 로 승진
                </Button>
              </form>
            ) : null}
            <form action={fireEmployee.bind(null, e.id)}>
              <Button variant="destructive" size="sm">
                해고
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="grid content-start gap-3 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">성과 (최근 30일)</h2>
          <div className="text-3xl font-bold tabular-nums">{Math.round(Number(perf?.overall ?? e.performance_score))}</div>
          {metrics.map(([label, v]) => (
            <div key={label} className="grid gap-1">
              <div className="flex justify-between text-xs">
                <span>{label}</span>
                <span className="tabular-nums">{Math.round(Number(v))}</span>
              </div>
              <ScoreBar value={Number(v)} />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            승진 기준: 종합 {PROMOTION_RULES.minOverall}+ · 승인율 {PROMOTION_RULES.minApprovalRate}+ · 정확도 {PROMOTION_RULES.minAccuracy}+ · 완료 업무 {PROMOTION_RULES.minCompletedTasks}건+
          </p>
          <h3 className="mt-2 text-sm font-semibold">CEO 평가</h3>
          <RatingForm employeeId={e.id} current={perf?.ceo_rating ?? null} />
        </section>

        <section className="grid content-start gap-3 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">권한 · 모델 · 사용량</h2>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">사용 모델</dt>
              <dd>{modelFor(e)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">권한 (Authority)</dt>
              <dd className="flex flex-wrap gap-1">
                {cfg.permissions.map((p) => (
                  <Badge key={p} variant="secondary">
                    {p}
                  </Badge>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">사용 가능 Tool</dt>
              <dd className="flex flex-wrap gap-1">
                {tools.map((t) => (
                  <Badge key={t} variant="outline">
                    {TOOL_LABELS[t]}
                  </Badge>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">오늘 토큰 사용량</dt>
              <dd className="tabular-nums">
                {tokensToday.toLocaleString()} tokens · {formatUsd(costToday, 4)} / {formatUsd(e.daily_budget)}
              </dd>
              <ScoreBar className="mt-1" value={costToday} max={Math.max(Number(e.daily_budget), 0.0001)} />
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">최근 30일 비용</dt>
              <dd className="tabular-nums">{formatUsd(costMonth, 4)}</dd>
            </div>
          </dl>
          <h3 className="mt-2 text-sm font-semibold">주요 업무</h3>
          <ul className="list-disc pl-4 text-sm text-muted-foreground">
            {role.duties.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>

        <section className="grid content-start gap-3 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">최근 업무</h2>
          {tasks?.length ? (
            <ul className="grid gap-2">
              {tasks.map((t) => (
                <li key={t.id} className="text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span>{t.title}</span>
                    <Badge variant={t.status === "DONE" ? "success" : t.status === "FAILED" || t.status === "REJECTED" ? "danger" : "secondary"}>
                      {TASK_STATUS_LABELS[t.status as TaskStatus]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(t.updated_at)}</p>
                  {t.last_error ? <p className="text-xs text-rose-600">{t.last_error}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">아직 업무 기록이 없습니다.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">직원 설정</h2>
        <EmployeeSettingsForm
          employee={{
            id: e.id,
            name: e.name,
            model: e.model,
            daily_budget: Number(e.daily_budget),
            token_budget: e.token_budget,
            personality: e.personality,
            system_prompt: e.system_prompt,
            interests: e.interests,
            specialty: e.specialty,
          }}
          defaultModel={modelFor({ model: null, position: e.position })}
        />
      </section>
    </div>
  );
}
