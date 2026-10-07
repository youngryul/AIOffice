import { DEFAULT_SCHEDULE, type WorkSchedule } from "@/lib/types/domain";

/** company_settings.schedule(jsonb) → 기본값으로 보정된 근무 시간표 */
export function resolveSchedule(raw: unknown): WorkSchedule {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<WorkSchedule>;
  const out = { ...DEFAULT_SCHEDULE };
  for (const key of Object.keys(DEFAULT_SCHEDULE) as (keyof WorkSchedule)[]) {
    const v = s[key];
    if (typeof v === "string" && /^\d{2}:\d{2}$/.test(v)) out[key] = v;
  }
  return out;
}
