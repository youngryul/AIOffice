import type { Metadata } from "next";
import { requireCompany } from "@/lib/services/session";
import { getLatestRun, getOfficeEmployees } from "@/lib/services/queries";
import { featureFlags } from "@/lib/env";
import { resolveSchedule } from "@/lib/schedule";
import { OfficeView } from "@/components/app/office-view";
import { WorkdayRunner } from "@/components/app/workday-runner";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Office" };

export default async function OfficePage() {
  const { supabase, companyId, settings } = await requireCompany();
  const [employees, run] = await Promise.all([getOfficeEmployees(supabase, companyId, settings.timezone), getLatestRun(supabase, companyId)]);
  const schedule = resolveSchedule(settings.schedule);

  return (
    <div className="grid gap-6">
      <PageHeader title="AI Office" description="AI 직원들이 실제 회사처럼 출근해서 조사하고, 회의하고, 보고합니다." />
      <div className="rounded-xl border bg-card p-4">
        <WorkdayRunner initialRun={run} aiReady={featureFlags().openai} />
      </div>
      <OfficeView employees={employees} live={run?.status === "running"} />
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">
          근무 시간표 ({settings.work_mode} MODE · {settings.timezone})
        </h2>
        <ol className="grid gap-1.5 text-sm sm:grid-cols-3 lg:grid-cols-5">
          {(
            [
              ["start", "출근"],
              ["morning_meeting", "Morning Meeting"],
              ["research", "Research"],
              ["team_review", "Team Review"],
              ["content", "Content / Strategy"],
              ["manager_review", "Manager Review"],
              ["executive_meeting", "Executive Meeting"],
              ["ceo_report", "CEO Report"],
              ["end", "퇴근"],
            ] as const
          ).map(([key, label]) => (
            <li key={key} className="flex gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
              <span className="font-mono tabular-nums">{schedule[key]}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
        {settings.work_mode === "FAST" ? (
          <p className="mt-3 text-xs text-muted-foreground">FAST MODE 에서는 위 시간표와 무관하게 버튼을 누르면 하루 업무 사이클을 몇 분 안에 실행합니다.</p>
        ) : null}
      </section>
    </div>
  );
}
