import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import { POSITION_CONFIG } from "@/lib/agents/positions";
import { ROLE_CATALOG } from "@/lib/agents/roles";
import { startOfDayInTz } from "@/lib/time";
import type { Department, EmployeeStatus, Position, RoleKey } from "@/lib/types/domain";
import type { OfficeEmployee } from "@/components/app/office-view";
import type { RunSnapshot } from "@/components/app/workday-runner";

/** 화면용 조회 (사용자 세션 + RLS). company_id 필터는 성능/명확성을 위해 함께 건다. */

export async function getLatestRun(supabase: ServerSupabase, companyId: string): Promise<RunSnapshot | null> {
  const { data } = await supabase
    .from("workday_runs")
    .select("id, stage, status, error, stage_log")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getOfficeEmployees(supabase: ServerSupabase, companyId: string, timezone: string): Promise<OfficeEmployee[]> {
  const since = startOfDayInTz(new Date(), timezone).toISOString();
  const [{ data: employees }, { data: tasks }, { data: usage }] = await Promise.all([
    supabase
      .from("employees")
      .select("*, current:current_task_id(title)")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("level", { ascending: false }),
    supabase
      .from("tasks")
      .select("assigned_employee, title, status, updated_at")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase.from("ai_usage").select("employee_id, input_tokens, output_tokens, estimated_cost").eq("company_id", companyId).gte("created_at", since),
  ]);

  return (employees ?? []).map((e) => {
    const mine = (usage ?? []).filter((u) => u.employee_id === e.id);
    const current = e.current as { title: string } | null;
    return {
      id: e.id,
      name: e.name,
      avatar: e.avatar,
      roleTitle: ROLE_CATALOG[e.role as RoleKey]?.title ?? e.role,
      department: e.department as Department,
      positionLabel: POSITION_CONFIG[e.position as Position].label,
      status: e.status as EmployeeStatus,
      currentTask: current?.title ?? null,
      recentWork: (tasks ?? [])
        .filter((t) => t.assigned_employee === e.id)
        .slice(0, 5)
        .map((t) => ({ title: t.title, status: t.status, at: t.updated_at })),
      performance: { accuracy: Number(e.accuracy_score), approvalRate: Number(e.approval_rate), overall: Number(e.performance_score) },
      usage: {
        costToday: mine.reduce((s, u) => s + Number(u.estimated_cost), 0),
        tokensToday: mine.reduce((s, u) => s + u.input_tokens + u.output_tokens, 0),
        dailyBudget: Number(e.daily_budget),
      },
    };
  });
}

export interface CostSummary {
  today: number;
  week: number;
  month: number;
  calls_today: number;
  by_employee: { employee_id: string | null; name: string | null; cost: number }[];
  by_department: { department: string; cost: number }[];
}

export async function getCostSummary(supabase: ServerSupabase, timezone: string): Promise<CostSummary> {
  const { data } = await supabase.rpc("ai_cost_summary", { p_tz: timezone });
  const d = (data ?? {}) as Partial<CostSummary>;
  return {
    today: Number(d.today ?? 0),
    week: Number(d.week ?? 0),
    month: Number(d.month ?? 0),
    calls_today: Number(d.calls_today ?? 0),
    by_employee: d.by_employee ?? [],
    by_department: d.by_department ?? [],
  };
}
