import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { BudgetExceededError } from "./errors";
import { startOfDayInTz, startOfMonthInTz } from "@/lib/time";

/**
 * AI 호출 전에 직원 일일 예산 / 회사 월 예산을 확인한다. 초과 시 업무 중단.
 */
export async function assertWithinBudget(
  db: AdminSupabase,
  params: { companyId: string; employeeId: string | null; dailyBudget: number | null; timezone: string },
) {
  const now = new Date();
  if (params.employeeId && params.dailyBudget !== null) {
    const { data, error } = await db.rpc("employee_spend_since", {
      p_employee_id: params.employeeId,
      p_since: startOfDayInTz(now, params.timezone).toISOString(),
    });
    if (error) throw new Error(`예산 조회 실패: ${error.message}`);
    if (Number(data ?? 0) >= params.dailyBudget) {
      throw new BudgetExceededError(
        `직원 일일 예산($${params.dailyBudget.toFixed(2)}) 초과로 업무를 중단했습니다.`,
        "employee",
      );
    }
  }

  const { data: settings } = await db
    .from("company_settings")
    .select("monthly_budget_usd")
    .eq("company_id", params.companyId)
    .maybeSingle();
  const monthly = Number(settings?.monthly_budget_usd ?? 0);
  if (monthly > 0) {
    const { data, error } = await db.rpc("company_spend_since", {
      p_company_id: params.companyId,
      p_since: startOfMonthInTz(now, params.timezone).toISOString(),
    });
    if (error) throw new Error(`예산 조회 실패: ${error.message}`);
    if (Number(data ?? 0) >= monthly) {
      throw new BudgetExceededError(`회사 월 예산($${monthly.toFixed(2)}) 초과로 AI 업무를 중단했습니다.`, "company");
    }
  }
}
