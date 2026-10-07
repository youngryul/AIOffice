"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/services/session";
import { toJson } from "@/lib/supabase/json";
import { isValidTimezone } from "@/lib/time";
import { DEFAULT_SCHEDULE, MEMORY_CATEGORIES, type WorkSchedule } from "@/lib/types/domain";

export interface SettingsState {
  error?: string;
  ok?: boolean;
}

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

const CompanySchema = z.object({
  name: z.string().trim().min(1).max(100),
  mission: z.string().trim().max(500),
  goals: z.string().trim().max(2000),
  brand_direction: z.string().trim().max(1000),
});

export async function updateCompany(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase, companyId } = await requireCompany();
  const parsed = CompanySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { error } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      mission: parsed.data.mission || null,
      goals: parsed.data.goals || null,
      brand_direction: parsed.data.brand_direction || null,
      interests: list(formData.get("interests")),
      brand_topics: list(formData.get("brand_topics")),
      research_keywords: list(formData.get("research_keywords")),
    })
    .eq("id", companyId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

export async function updateWorkSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase, companyId } = await requireCompany();
  const schedule = {} as WorkSchedule;
  for (const key of Object.keys(DEFAULT_SCHEDULE) as (keyof WorkSchedule)[]) {
    const v = hhmm.safeParse(formData.get(`schedule_${key}`));
    if (!v.success) return { error: `${key} 시간 형식이 올바르지 않습니다.` };
    schedule[key] = v.data;
  }
  const order: (keyof WorkSchedule)[] = ["start", "morning_meeting", "research", "team_review", "content", "manager_review", "executive_meeting", "ceo_report", "end"];
  for (let i = 1; i < order.length; i++) {
    if (schedule[order[i]] < schedule[order[i - 1]]) return { error: "근무 일정은 출근 → 퇴근 순서로 시간이 늘어나야 합니다." };
  }
  const parsed = z
    .object({
      timezone: z.string().refine(isValidTimezone, "올바른 타임존이 아닙니다"),
      work_mode: z.enum(["REAL", "FAST"]),
      monthly_budget_usd: z.coerce.number().min(0).max(100000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const workdays = formData.getAll("workdays").map(Number).filter((d) => d >= 0 && d <= 6);

  const { error } = await supabase
    .from("company_settings")
    .update({
      ...parsed.data,
      schedule: toJson(schedule),
      workdays,
      ai_enabled: formData.get("ai_enabled") === "on",
    })
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addMemoryItem(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase, companyId } = await requireCompany();
  const parsed = z
    .object({ category: z.enum(MEMORY_CATEGORIES), content: z.string().trim().min(2).max(1000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "내용을 입력하세요." };
  const { error } = await supabase.from("company_memory").insert({ company_id: companyId, ...parsed.data, source: "ceo", weight: 3 });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteMemoryItem(id: string) {
  const { supabase, companyId } = await requireCompany();
  await supabase.from("company_memory").delete().eq("id", id).eq("company_id", companyId);
  revalidatePath("/settings");
}
