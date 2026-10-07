import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { toJson } from "@/lib/supabase/json";
import { env } from "@/lib/env";
import { AiNotConfiguredError, BudgetExceededError, errorMessage } from "@/lib/ai/errors";
import { dateInTz } from "@/lib/time";
import { WORKFLOW_STAGES, type WorkMode, type WorkSchedule, type WorkflowStage } from "@/lib/types/domain";
import { loadWorkflowContext, type RunRow, type WorkflowContext } from "./context";
import { morningMeetingStage } from "./stages/morningMeeting";
import { researchStage } from "./stages/research";
import { teamReviewStage } from "./stages/teamReview";
import { analysisStage } from "./stages/analysis";
import { contentStage } from "./stages/content";
import { executiveMeetingStage } from "./stages/executiveMeeting";
import { executiveSummaryStage } from "./stages/executiveSummary";

type ActiveStage = Exclude<WorkflowStage, "done">;

/**
 * Task → Research → Individual Analysis → Team Review → Meeting → Manager Review
 *      → Executive Summary → CEO Approval → (Execution → Archive → Notion Sync: 결재 이후)
 */
const STAGE_HANDLERS: Record<ActiveStage, (ctx: WorkflowContext) => Promise<void>> = {
  morning_meeting: morningMeetingStage,
  research: researchStage,
  team_review: teamReviewStage,
  analysis: analysisStage,
  content: contentStage,
  executive_meeting: executiveMeetingStage,
  executive_summary: executiveSummaryStage,
};

/** REAL MODE 에서 각 단계가 실행되는 업무시간 (company_settings.schedule 키) */
export const STAGE_SCHEDULE_KEY: Record<ActiveStage, keyof WorkSchedule> = {
  morning_meeting: "morning_meeting",
  research: "research",
  team_review: "team_review",
  analysis: "content",
  content: "content",
  executive_meeting: "executive_meeting",
  executive_summary: "ceo_report",
};

/** 단계 실패 시 재시도 횟수 (이후 Run 은 failed) */
export const MAX_STAGE_RETRIES = 2;
/** 한 단계 실행 잠금 시간 — Vercel maxDuration(300s) 보다 길게 */
const LOCK_MS = 6 * 60 * 1000;

export function nextStage(stage: WorkflowStage): WorkflowStage {
  const i = WORKFLOW_STAGES.indexOf(stage);
  return WORKFLOW_STAGES[Math.min(i + 1, WORKFLOW_STAGES.length - 1)];
}

export class RunAlreadyActiveError extends Error {
  constructor(readonly run: RunRow) {
    super("이미 진행 중인 업무 사이클이 있습니다.");
  }
}

export async function startRun(db: AdminSupabase, companyId: string, mode: WorkMode): Promise<RunRow> {
  if (!env().OPENAI_API_KEY) throw new AiNotConfiguredError();
  const { data: settings } = await db.from("company_settings").select("timezone, ai_enabled").eq("company_id", companyId).single();
  if (settings && !settings.ai_enabled) throw new Error("설정에서 AI 업무가 비활성화되어 있습니다.");

  const { data: running } = await db.from("workday_runs").select("*").eq("company_id", companyId).eq("status", "running").maybeSingle();
  if (running) throw new RunAlreadyActiveError(running);

  const { data, error } = await db
    .from("workday_runs")
    .insert({ company_id: companyId, run_date: dateInTz(new Date(), settings?.timezone ?? "Asia/Seoul"), mode })
    .select("*")
    .single();
  if (error?.code === "23505") {
    const { data: again } = await db.from("workday_runs").select("*").eq("company_id", companyId).eq("status", "running").single();
    if (again) throw new RunAlreadyActiveError(again);
  }
  if (error || !data) throw new Error(`업무 사이클 시작 실패: ${error?.message}`);
  return data;
}

interface StageLogEntry {
  stage: WorkflowStage;
  status: "completed" | "failed";
  at: string;
  logs: string[];
  error?: string;
}

/**
 * Run 을 한 단계 진행한다. 동시에 두 요청이 같은 Run 을 진행하지 않도록 locked_until 로 잠근다.
 * 반환: 진행 후 Run (잠겨 있으면 진행하지 않고 현재 상태 반환)
 */
export async function advanceRun(db: AdminSupabase, companyId: string, runId: string): Promise<{ run: RunRow; advanced: boolean }> {
  const now = new Date();
  const { data: locked } = await db
    .from("workday_runs")
    .update({ locked_until: new Date(now.getTime() + LOCK_MS).toISOString() })
    .eq("id", runId)
    .eq("company_id", companyId)
    .eq("status", "running")
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select("*")
    .maybeSingle();

  if (!locked) {
    const { data: current, error } = await db.from("workday_runs").select("*").eq("id", runId).eq("company_id", companyId).single();
    if (error || !current) throw new Error("업무 사이클을 찾을 수 없습니다.");
    return { run: current, advanced: false };
  }

  const stage = locked.stage as WorkflowStage;
  const log = (locked.stage_log as unknown as StageLogEntry[]) ?? [];
  if (stage === "done") {
    const { data } = await db.from("workday_runs").update({ status: "completed", locked_until: null }).eq("id", runId).select("*").single();
    return { run: data ?? locked, advanced: false };
  }

  let ctx: WorkflowContext | null = null;
  try {
    ctx = await loadWorkflowContext(db, locked);
    await STAGE_HANDLERS[stage](ctx);

    const next = nextStage(stage);
    const done = next === "done";
    const { data } = await db
      .from("workday_runs")
      .update({
        stage: next,
        stage_retry: 0,
        locked_until: null,
        error: null,
        status: done ? "completed" : "running",
        completed_at: done ? new Date().toISOString() : null,
        stage_log: toJson([...log, { stage, status: "completed", at: new Date().toISOString(), logs: ctx.logs }]),
      })
      .eq("id", runId)
      .select("*")
      .single();
    if (done) await setAllEmployees(db, companyId, "offline");
    return { run: data ?? locked, advanced: true };
  } catch (err) {
    const fatal =
      err instanceof AiNotConfiguredError || (err instanceof BudgetExceededError && err.scope === "company");
    const retries = locked.stage_retry + 1;
    const failed = fatal || retries > MAX_STAGE_RETRIES;
    const message = errorMessage(err);
    console.error(`[workflow] stage ${stage} failed (retry ${retries})`, message);
    const { data } = await db
      .from("workday_runs")
      .update({
        stage_retry: retries,
        locked_until: null,
        error: message,
        status: failed ? "failed" : "running",
        completed_at: failed ? new Date().toISOString() : null,
        stage_log: toJson([
          ...log,
          { stage, status: "failed", at: new Date().toISOString(), logs: ctx?.logs ?? [], error: message },
        ]),
      })
      .eq("id", runId)
      .select("*")
      .single();
    if (failed) await setAllEmployees(db, companyId, "offline");
    return { run: data ?? locked, advanced: false };
  }
}

export async function cancelRun(db: AdminSupabase, companyId: string, runId: string) {
  await db
    .from("workday_runs")
    .update({ status: "cancelled", locked_until: null, completed_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("company_id", companyId)
    .eq("status", "running");
  await setAllEmployees(db, companyId, "offline");
}

export async function setAllEmployees(db: AdminSupabase, companyId: string, status: "offline" | "working" | "break") {
  await db.from("employees").update({ status, current_task_id: null }).eq("company_id", companyId).eq("is_active", true);
}
