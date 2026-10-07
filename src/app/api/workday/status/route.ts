import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { companyFromRequest } from "@/lib/services/api-auth";

/** Office View 실시간 표시용: 최근 Run + 직원 상태 (RLS 적용된 사용자 세션으로 조회) */
export async function GET() {
  const auth = await companyFromRequest();
  if (auth instanceof NextResponse) return auth;
  const supabase = await createClient();
  const [{ data: run }, { data: employees }] = await Promise.all([
    supabase
      .from("workday_runs")
      .select("id, stage, status, error, stage_log, started_at, completed_at, mode")
      .eq("company_id", auth.companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("id, status, current_task_id, tasks:current_task_id(title)")
      .eq("company_id", auth.companyId)
      .eq("is_active", true),
  ]);
  return NextResponse.json({ run, employees: employees ?? [] });
}
