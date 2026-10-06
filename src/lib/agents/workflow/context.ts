import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { getCompanyContext, type CompanyContext } from "@/lib/tools/companyContext";
import { dateInTz } from "@/lib/time";
import type { RoleKey } from "@/lib/types/domain";
import { AgentEmployee } from "../agent";
import { POSITION_CONFIG } from "../positions";

export type RunRow = Tables<"workday_runs">;

export interface WorkflowContext {
  db: AdminSupabase;
  run: RunRow;
  company: CompanyContext;
  today: string;
  employees: AgentEmployee[];
  byRole(role: RoleKey): AgentEmployee | undefined;
  allByRole(role: RoleKey): AgentEmployee[];
  /** Team Review 담당: 팩트체커 → review 권한(Manager 이상)을 가진 직원 중 최고 직급 */
  reviewer(): AgentEmployee | undefined;
  /** Executive Summary 담당: 비서실장 → ceo_report 권한을 가진 직원 */
  executive(): AgentEmployee | undefined;
  log(message: string): void;
  logs: string[];
}

export async function loadWorkflowContext(db: AdminSupabase, run: RunRow): Promise<WorkflowContext> {
  const company = await getCompanyContext(db, run.company_id);
  const { data: rows, error } = await db
    .from("employees")
    .select("*")
    .eq("company_id", run.company_id)
    .eq("is_active", true)
    .order("level", { ascending: false });
  if (error) throw new Error(`직원 목록 조회 실패: ${error.message}`);

  const today = dateInTz(new Date(), company.timezone);
  const employees = (rows ?? []).map((r) => new AgentEmployee(r, db, company, run.id, today));
  const logs: string[] = [];

  const sortedByLevel = [...employees].sort(
    (a, b) => POSITION_CONFIG[b.position].level - POSITION_CONFIG[a.position].level,
  );

  return {
    db,
    run,
    company,
    today,
    employees,
    logs,
    byRole: (role) => employees.find((e) => e.role === role),
    allByRole: (role) => employees.filter((e) => e.role === role),
    reviewer: () =>
      employees.find((e) => e.role === "fact_checker" && e.can("review")) ??
      sortedByLevel.find((e) => e.can("review") && !["ai_trend_researcher", "vibe_coding_researcher", "market_researcher"].includes(e.role)),
    executive: () =>
      employees.find((e) => e.role === "chief_of_staff" && e.can("ceo_report")) ?? sortedByLevel.find((e) => e.can("ceo_report")),
    log: (message) => {
      logs.push(message);
    },
  };
}
