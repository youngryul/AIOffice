"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCompany } from "@/lib/services/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { resetCompany } from "@/lib/services/reset";
import { MAX_REFERENCE_SITES, normalizeSiteUrl, parseReferenceSites } from "@/lib/reference-sites";
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
    .from("aio_companies")
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
    .from("aio_company_settings")
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
  const { error } = await supabase.from("aio_company_memory").insert({ company_id: companyId, ...parsed.data, source: "ceo", weight: 3 });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * 회사 초기화 (위험 작업). 클라이언트 팝업의 확인 절차와 별개로 서버에서도 한 번 더 검증한다:
 *  - 안내 문구에 동의했는지
 *  - 입력한 회사 이름이 현재 회사 이름과 정확히 같은지
 */
export async function resetCompanyAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { userId, companyId, company } = await requireCompany();
  if (formData.get("acknowledge") !== "on") return { error: "삭제 내용을 확인했다는 항목에 체크하세요." };
  if (String(formData.get("confirm_name") ?? "").trim() !== company.name) return { error: "회사 이름이 일치하지 않습니다." };
  try {
    await resetCompany(createAdminClient(), { userId, companyId });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "초기화에 실패했습니다." };
  }
  revalidatePath("/", "layout");
  redirect("/onboarding");
}

/** 참고 사이트 추가 — AI 직원이 조사할 때 함께 확인한다 */
export async function addReferenceSite(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase, companyId, company } = await requireCompany();
  const url = normalizeSiteUrl(String(formData.get("url") ?? ""));
  if (!url) return { error: "올바른 사이트 주소(http/https)를 입력하세요." };
  const label = String(formData.get("label") ?? "").trim().slice(0, 60);
  const current = parseReferenceSites(company.reference_sites);
  if (current.some((s) => s.url === url)) return { error: "이미 등록된 사이트입니다." };
  if (current.length >= MAX_REFERENCE_SITES) return { error: `사이트는 최대 ${MAX_REFERENCE_SITES}개까지 등록할 수 있습니다.` };
  const { error } = await supabase
    .from("aio_companies")
    .update({ reference_sites: toJson([...current, { url, label }]) })
    .eq("id", companyId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeReferenceSite(url: string) {
  const { supabase, companyId, company } = await requireCompany();
  const next = parseReferenceSites(company.reference_sites).filter((s) => s.url !== url);
  await supabase.from("aio_companies").update({ reference_sites: toJson(next) }).eq("id", companyId);
  revalidatePath("/settings");
}

export async function deleteMemoryItem(id: string) {
  const { supabase, companyId } = await requireCompany();
  await supabase.from("aio_company_memory").delete().eq("id", id).eq("company_id", companyId);
  revalidatePath("/settings");
}
