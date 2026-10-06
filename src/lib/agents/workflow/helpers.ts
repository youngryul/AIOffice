import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { BudgetExceededError, errorMessage } from "@/lib/ai/errors";
import type { RoleKey } from "@/lib/types/domain";
import type { WorkflowContext } from "./context";

export type TaskRow = Tables<"tasks">;
export type TaskType = TaskRow["task_type"];

export function taskTypeForRole(role: RoleKey): TaskType {
  switch (role) {
    case "ai_trend_researcher":
    case "vibe_coding_researcher":
    case "market_researcher":
      return "research";
    case "business_analyst":
      return "analysis";
    case "content_strategist":
    case "brand_strategist":
      return "content";
    case "fact_checker":
      return "review";
    case "chief_of_staff":
      return "summary";
  }
}

/** 동시 실행 개수를 제한한 병렬 실행 (Promise.allSettled 와 같은 결과 형태) */
export async function runLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function updateTask(db: AdminSupabase, companyId: string, taskId: string, patch: Partial<TaskRow>) {
  const { error } = await db.from("tasks").update(patch).eq("id", taskId).eq("company_id", companyId);
  if (error) throw new Error(`Task 업데이트 실패: ${error.message}`);
}

/** 업무 실패 기록: retry_count / last_error 저장 (무한 재시도 금지 — 실패한 업무는 FAILED) */
export async function failTask(ctx: WorkflowContext, task: Pick<TaskRow, "id" | "retry_count" | "title">, err: unknown) {
  const message = err instanceof BudgetExceededError ? `[예산 초과] ${err.message}` : errorMessage(err);
  await updateTask(ctx.db, ctx.company.id, task.id, {
    status: "FAILED",
    retry_count: task.retry_count + 1,
    last_error: message,
  });
  ctx.log(`❌ ${task.title}: ${message}`);
}

/** 오늘 Run 에 속한 특정 유형의 Task 를 찾거나, 없으면 만든다 */
export async function ensureTask(
  ctx: WorkflowContext,
  params: { employeeId: string; taskType: TaskType; title: string; description: string; department: string },
): Promise<TaskRow> {
  const { data: existing } = await ctx.db
    .from("tasks")
    .select("*")
    .eq("company_id", ctx.company.id)
    .eq("run_id", ctx.run.id)
    .eq("assigned_employee", params.employeeId)
    .eq("task_type", params.taskType)
    .in("status", ["TODO", "WORKING"])
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  const insert: TablesInsert<"tasks"> = {
    company_id: ctx.company.id,
    run_id: ctx.run.id,
    title: params.title,
    description: params.description,
    department: params.department,
    task_type: params.taskType,
    assigned_employee: params.employeeId,
    priority: "medium",
    created_by: "chief_of_staff",
    source: "system",
  };
  const { data, error } = await ctx.db.from("tasks").insert(insert).select("*").single();
  if (error || !data) throw new Error(`Task 생성 실패: ${error?.message}`);
  return data;
}

export async function createMeeting(
  ctx: WorkflowContext,
  params: { type: "morning" | "team" | "executive" | "project"; topic: string; coordinatorId: string | null; participantIds: string[] },
) {
  const { data: meeting, error } = await ctx.db
    .from("meetings")
    .insert({
      company_id: ctx.company.id,
      run_id: ctx.run.id,
      type: params.type,
      topic: params.topic,
      coordinator_id: params.coordinatorId,
      status: "in_progress",
    })
    .select("*")
    .single();
  if (error || !meeting) throw new Error(`회의 생성 실패: ${error?.message}`);
  const participants = [...new Set(params.participantIds)];
  if (participants.length) {
    await ctx.db
      .from("meeting_participants")
      .insert(participants.map((employee_id) => ({ meeting_id: meeting.id, employee_id, company_id: ctx.company.id })));
  }
  return meeting;
}

/** JSON 출력 중 프롬프트에 넣을 짧은 요약 */
export function truncate(text: string | null | undefined, max = 600): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function validIndex(index: number | null | undefined, length: number): number | null {
  if (index === null || index === undefined || !Number.isInteger(index)) return null;
  return index >= 0 && index < length ? index : null;
}
