import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { errorMessage } from "@/lib/ai/errors";
import { dateInTz, minutesOf, timeInTz, zonedParts } from "@/lib/time";
import type { WorkSchedule, WorkflowStage } from "@/lib/types/domain";
import { resolveSchedule } from "@/lib/schedule";
import { advanceRun, setAllEmployees, startRun, STAGE_SCHEDULE_KEY, RunAlreadyActiveError } from "./engine";

export { resolveSchedule };

/** REAL MODE: 지금 이 단계를 실행할 시간이 되었는가 */
export function isStageDue(stage: WorkflowStage, schedule: WorkSchedule, nowHHMM: string): boolean {
  if (stage === "done") return false;
  return minutesOf(nowHHMM) >= minutesOf(schedule[STAGE_SCHEDULE_KEY[stage]]);
}

export interface TickReport {
  company_id: string;
  action: string;
}

/**
 * Cron tick (5~10분마다 실행 권장)
 *  - REAL MODE 회사: 업무시간에 맞춰 Run 시작 / 단계 진행 / 퇴근 처리
 *  - 모든 회사: 브라우저가 닫혀 멈춘 FAST MODE Run 을 이어서 진행
 */
export async function runSchedulerTick(db: AdminSupabase, maxAdvances = 3): Promise<TickReport[]> {
  const report: TickReport[] = [];
  let advances = 0;
  const now = new Date();

  const { data: companies } = await db
    .from("company_settings")
    .select("company_id, timezone, work_mode, schedule, workdays, ai_enabled");

  for (const c of companies ?? []) {
    if (advances >= maxAdvances) break;
    try {
      const { data: running } = await db.from("workday_runs").select("*").eq("company_id", c.company_id).eq("status", "running").maybeSingle();

      if (c.work_mode === "FAST") {
        // 멈춘 FAST Run 재개 (1분 이상 아무도 진행하지 않은 경우)
        if (running && (!running.locked_until || new Date(running.locked_until) < now)) {
          const lastLog = (running.stage_log as { at?: string }[] | null)?.at(-1)?.at ?? running.started_at;
          if (now.getTime() - new Date(lastLog).getTime() > 60_000) {
            await advanceRun(db, c.company_id, running.id);
            advances++;
            report.push({ company_id: c.company_id, action: `fast:resume:${running.stage}` });
          }
        }
        continue;
      }

      if (!c.ai_enabled) continue;
      const schedule = resolveSchedule(c.schedule);
      const nowHHMM = timeInTz(now, c.timezone);
      const weekday = zonedParts(now, c.timezone).weekday;
      const isWorkday = c.workdays.includes(weekday);

      if (running) {
        if (isStageDue(running.stage as WorkflowStage, schedule, nowHHMM)) {
          await advanceRun(db, c.company_id, running.id);
          advances++;
          report.push({ company_id: c.company_id, action: `real:advance:${running.stage}` });
        }
        continue;
      }

      const inHours = minutesOf(nowHHMM) >= minutesOf(schedule.start) && minutesOf(nowHHMM) < minutesOf(schedule.end);
      if (!isWorkday || !inHours) {
        if (minutesOf(nowHHMM) >= minutesOf(schedule.end) || !isWorkday) await setAllEmployees(db, c.company_id, "offline");
        continue;
      }

      const today = dateInTz(now, c.timezone);
      const { count } = await db
        .from("workday_runs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", c.company_id)
        .eq("run_date", today)
        .eq("mode", "REAL");
      if ((count ?? 0) === 0) {
        await setAllEmployees(db, c.company_id, "working"); // 출근
        const run = await startRun(db, c.company_id, "REAL");
        report.push({ company_id: c.company_id, action: "real:start" });
        if (isStageDue("morning_meeting", schedule, nowHHMM)) {
          await advanceRun(db, c.company_id, run.id);
          advances++;
        }
      }
    } catch (err) {
      if (err instanceof RunAlreadyActiveError) continue;
      report.push({ company_id: c.company_id, action: `error:${errorMessage(err)}` });
    }
  }
  return report;
}
