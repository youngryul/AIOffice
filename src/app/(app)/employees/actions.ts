"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCompany } from "@/lib/services/session";
import { buildEmployeeRow } from "@/lib/services/employees";
import { POSITION_CONFIG, nextPosition } from "@/lib/agents/positions";
import { dateInTz } from "@/lib/time";
import { POSITIONS, ROLES, type Position } from "@/lib/types/domain";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

export async function hireEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, companyId, userId } = await requireCompany();
  const parsed = z
    .object({ role: z.enum(ROLES), name: z.string().trim().max(40).optional(), position: z.enum(POSITIONS).optional() })
    .safeParse({ role: formData.get("role"), name: formData.get("name") || undefined, position: formData.get("position") || undefined });
  if (!parsed.success) return { error: "역할을 선택하세요." };

  const { error } = await supabase.from("employees").insert(buildEmployeeRow({ companyId, userId, ...parsed.data }));
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function fireEmployee(employeeId: string) {
  const { supabase, companyId } = await requireCompany();
  await supabase
    .from("employees")
    .update({ is_active: false, fired_at: new Date().toISOString(), status: "offline" })
    .eq("id", employeeId)
    .eq("company_id", companyId);
  revalidatePath("/", "layout");
  redirect("/employees");
}

export async function rehireEmployee(employeeId: string) {
  const { supabase, companyId } = await requireCompany();
  await supabase.from("employees").update({ is_active: true, fired_at: null }).eq("id", employeeId).eq("company_id", companyId);
  revalidatePath("/", "layout");
}

const SettingsSchema = z.object({
  name: z.string().trim().min(1).max(40),
  model: z.string().trim().max(60),
  daily_budget: z.coerce.number().min(0).max(100),
  token_budget: z.coerce.number().int().min(1000).max(128000),
  personality: z.string().trim().max(500),
  system_prompt: z.string().trim().max(4000),
});

export async function updateEmployeeSettings(employeeId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, companyId } = await requireCompany();
  const parsed = SettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값 오류" };
  const d = parsed.data;
  const { error } = await supabase
    .from("employees")
    .update({
      name: d.name,
      model: d.model || null,
      daily_budget: d.daily_budget,
      token_budget: d.token_budget,
      personality: d.personality || null,
      system_prompt: d.system_prompt || null,
      interests: list(formData.get("interests")),
      specialty: list(formData.get("specialty")),
    })
    .eq("id", employeeId)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  revalidatePath(`/employees/${employeeId}`);
  return { ok: true };
}

/** CEO 직원 평가 (1~5) — 종합 성과에 20% 반영 */
export async function rateEmployee(employeeId: string, rating: number, notes: string) {
  const { supabase, companyId, settings } = await requireCompany();
  const r = Math.min(5, Math.max(1, Math.round(rating)));
  const today = dateInTz(new Date(), settings.timezone);
  await supabase.from("employee_performance").upsert(
    { company_id: companyId, employee_id: employeeId, period_date: today, ceo_rating: r, notes: notes.slice(0, 1000) || null },
    { onConflict: "employee_id,period_date" },
  );
  revalidatePath(`/employees/${employeeId}`);
}

/** 승진: Level / 기본 AI 모델 / Token Budget / 권한(Authority) 이 함께 바뀐다 */
export async function promoteEmployee(employeeId: string) {
  const { supabase, companyId } = await requireCompany();
  const { data: emp } = await supabase.from("employees").select("position, name").eq("id", employeeId).eq("company_id", companyId).single();
  if (!emp) return;
  const next = nextPosition(emp.position as Position);
  if (!next) return;
  const cfg = POSITION_CONFIG[next];
  await supabase
    .from("employees")
    .update({
      position: next,
      level: cfg.level,
      token_budget: cfg.tokenBudget,
      daily_budget: cfg.dailyBudget,
      model: null, // 직급 기본 모델 사용 (상위 모델로 자동 업그레이드)
      promotion_candidate: false,
    })
    .eq("id", employeeId)
    .eq("company_id", companyId);
  await supabase.from("company_memory").insert({
    company_id: companyId,
    category: "past_decisions",
    content: `${emp.name} 을(를) ${cfg.label} 로 승진시킴`,
    source: "ceo",
  });
  revalidatePath("/", "layout");
}
