import "server-only";
import { z } from "zod";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { toJson } from "@/lib/supabase/json";
import { MVP_ROLES } from "@/lib/agents/roles";
import { dateInTz, isValidTimezone } from "@/lib/time";
import { DEFAULT_SCHEDULE, ROLES, type RoleKey } from "@/lib/types/domain";
import { buildEmployeeRow } from "./employees";
import { seedDemoData } from "./demo";

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

export const OnboardingSchema = z.object({
  companyName: z.string().trim().min(1, "회사 이름을 입력하세요").max(100),
  interests: z.array(z.string().trim().min(1).max(40)).max(20),
  brandTopics: z.array(z.string().trim().min(1).max(40)).max(20),
  brandDirection: z.string().trim().max(500).optional().default(""),
  timezone: z.string().refine(isValidTimezone, "올바른 타임존이 아닙니다").default("Asia/Seoul"),
  workStart: hhmm.default(DEFAULT_SCHEDULE.start),
  workEnd: hhmm.default(DEFAULT_SCHEDULE.end),
  roles: z.array(z.enum(ROLES)).min(1, "직원을 1명 이상 선택하세요"),
  withDemo: z.boolean().default(true),
});
export type OnboardingInput = z.infer<typeof OnboardingSchema>;

/**
 * 온보딩: 회사 / 설정 / 직원 / 회사 기억 / (선택) 데모 데이터 생성 후 profile 에 company_id 연결.
 * userId 는 반드시 서버에서 검증된 세션의 값이어야 한다.
 */
export async function createCompanyForUser(db: AdminSupabase, userId: string, input: OnboardingInput) {
  const { data: profile } = await db.from("profiles").select("company_id").eq("id", userId).single();
  if (profile?.company_id) {
    const { data: existing } = await db.from("companies").select("id, onboarding_completed").eq("id", profile.company_id).single();
    if (existing?.onboarding_completed) return existing.id;
    // 온보딩 도중 실패한 회사는 정리 후 다시 만든다
    await db.from("companies").delete().eq("id", profile.company_id).eq("owner_id", userId);
  }

  const { data: company, error } = await db
    .from("companies")
    .insert({
      owner_id: userId,
      name: input.companyName,
      brand_direction: input.brandDirection || null,
      interests: input.interests,
      brand_topics: input.brandTopics,
      research_keywords: input.interests,
      is_demo: input.withDemo,
    })
    .select("id")
    .single();
  if (error || !company) throw new Error(`회사 생성 실패: ${error?.message}`);
  const companyId = company.id;

  try {
    await db.from("profiles").update({ company_id: companyId }).eq("id", userId);

    const { error: sErr } = await db.from("company_settings").insert({
      company_id: companyId,
      timezone: input.timezone,
      work_mode: "FAST",
      schedule: toJson({ ...DEFAULT_SCHEDULE, start: input.workStart, end: input.workEnd }),
    });
    if (sErr) throw new Error(sErr.message);

    const roles: RoleKey[] = input.roles.includes("chief_of_staff") ? input.roles : ["chief_of_staff", ...input.roles];
    const { data: employees, error: eErr } = await db
      .from("employees")
      .insert(roles.map((role) => buildEmployeeRow({ companyId, userId, role, interests: role === "chief_of_staff" ? [] : input.interests.slice(0, 5) })))
      .select("id, role");
    if (eErr) throw new Error(eErr.message);

    const memories = [
      ...input.interests.map((i) => ({ category: "research_interests" as const, content: `CEO 관심 분야: ${i}` })),
      ...input.brandTopics.map((t) => ({ category: "brand_identity" as const, content: `브랜드 주제: ${t}` })),
      ...(input.brandDirection ? [{ category: "brand_identity" as const, content: `브랜드 방향: ${input.brandDirection}` }] : []),
    ];
    if (memories.length) {
      await db.from("company_memory").insert(memories.map((m) => ({ ...m, company_id: companyId, source: "ceo" as const, weight: 2 })));
    }

    if (input.withDemo) {
      const ids = Object.fromEntries((employees ?? []).map((e) => [e.role, e.id]));
      await seedDemoData(db, companyId, dateInTz(new Date(), input.timezone), ids);
    }

    await db.from("companies").update({ onboarding_completed: true }).eq("id", companyId);
    return companyId;
  } catch (err) {
    await db.from("companies").delete().eq("id", companyId);
    throw err;
  }
}

export const DEFAULT_ONBOARDING_ROLES: RoleKey[] = MVP_ROLES;
