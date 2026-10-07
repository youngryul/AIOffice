import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { getCostSummary, getLatestRun, getOfficeEmployees } from "@/lib/services/queries";
import { featureFlags } from "@/lib/env";
import { startOfDayInTz } from "@/lib/time";
import { BriefView } from "@/components/app/brief-view";
import { OfficeView } from "@/components/app/office-view";
import { WorkdayRunner } from "@/components/app/workday-runner";
import { Stat } from "@/components/ui/misc";
import { formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase, companyId, company, settings } = await requireCompany();
  const tz = settings.timezone;
  const dayStart = startOfDayInTz(new Date(), tz).toISOString();

  const [{ data: brief }, { data: approvals }, employees, run, cost, todayTasks, trends, opps, contents] = await Promise.all([
    supabase.from("daily_briefs").select("*").eq("company_id", companyId).order("brief_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("approvals").select("id, title, type, recommendation").eq("company_id", companyId).eq("status", "PENDING").order("created_at", { ascending: false }).limit(5),
    getOfficeEmployees(supabase, companyId, tz),
    getLatestRun(supabase, companyId),
    getCostSummary(supabase, tz),
    supabase.from("tasks").select("status").eq("company_id", companyId).gte("created_at", dayStart),
    supabase.from("trends").select("id", { count: "exact", head: true }).eq("company_id", companyId).neq("status", "archived"),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("company_id", companyId).neq("status", "ARCHIVED"),
    supabase.from("content_ideas").select("id", { count: "exact", head: true }).eq("company_id", companyId),
  ]);

  const working = employees.filter((e) => e.status !== "offline" && e.status !== "break").length;
  const taskRows = todayTasks.data ?? [];
  const doneTasks = taskRows.filter((t) => ["DONE", "APPROVED"].includes(t.status)).length;
  const monthlyBudget = Number(settings.monthly_budget_usd);

  return (
    <div className="grid gap-8">
      <section aria-labelledby="brief-heading" className="grid gap-3">
        <div className="flex items-end justify-between">
          <h1 id="brief-heading" className="text-2xl font-bold tracking-tight">
            CEO Morning Brief
          </h1>
          <span className="text-sm text-muted-foreground">{company.name}</span>
        </div>
        <BriefView brief={brief} approvals={approvals ?? []} />
      </section>

      <section aria-labelledby="office-heading" className="grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="office-heading" className="text-lg font-semibold">
              Office View
            </h2>
            <p className="text-sm text-muted-foreground">직원을 클릭하면 현재 업무와 성과를 볼 수 있습니다.</p>
          </div>
          <WorkdayRunner initialRun={run} aiReady={featureFlags().openai} compact />
        </div>
        <OfficeView employees={employees} live={run?.status === "running"} />
        {run ? (
          <Link href="/office" className="text-xs text-muted-foreground hover:text-foreground">
            업무 진행 단계와 로그 보기 →
          </Link>
        ) : null}
      </section>

      <section aria-label="회사 현황" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Stat label="AI Employees Working" value={`${working}/${employees.length}`} />
        <Stat label="Today's Tasks" value={`${doneTasks}/${taskRows.length}`} hint="완료 / 전체" />
        <Link href="/approvals">
          <Stat label="CEO Approvals" value={approvals?.length ?? 0} hint="대기 중" />
        </Link>
        <Link href="/trends">
          <Stat label="AI Trends" value={trends.count ?? 0} />
        </Link>
        <Link href="/opportunities">
          <Stat label="Opportunities" value={opps.count ?? 0} />
        </Link>
        <Link href="/content">
          <Stat label="Content Ideas" value={contents.count ?? 0} />
        </Link>
        <Stat label="AI Cost (오늘)" value={formatUsd(cost.today)} hint={`월 ${formatUsd(cost.month)} / ${formatUsd(monthlyBudget)}`} />
      </section>

      <section aria-labelledby="cost-heading" className="grid gap-3">
        <h2 id="cost-heading" className="text-lg font-semibold">
          AI 비용
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Stat label="Today's AI Cost" value={formatUsd(cost.today, 4)} hint={`${cost.calls_today}회 호출`} />
          <Stat label="Weekly Cost" value={formatUsd(cost.week)} />
          <Stat label="Monthly Cost" value={formatUsd(cost.month)} hint={monthlyBudget > 0 ? `예산 대비 ${Math.round((cost.month / monthlyBudget) * 100)}%` : undefined} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Cost Per Employee (이번 달)</h3>
            {cost.by_employee.length ? (
              <ul className="grid gap-1 text-sm">
                {cost.by_employee.map((r) => (
                  <li key={r.employee_id ?? "system"} className="flex justify-between">
                    <span>{r.name ?? "시스템"}</span>
                    <span className="tabular-nums">{formatUsd(r.cost, 4)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">아직 AI 사용 기록이 없습니다.</p>
            )}
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Cost Per Department (이번 달)</h3>
            {cost.by_department.length ? (
              <ul className="grid gap-1 text-sm">
                {cost.by_department.map((r) => (
                  <li key={r.department} className="flex justify-between">
                    <span>{r.department}</span>
                    <span className="tabular-nums">{formatUsd(r.cost, 4)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">아직 AI 사용 기록이 없습니다.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
