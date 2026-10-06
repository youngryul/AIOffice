import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";

export interface CompanyContext {
  id: string;
  name: string;
  mission: string | null;
  goals: string | null;
  brandDirection: string | null;
  interests: string[];
  brandTopics: string[];
  researchKeywords: string[];
  timezone: string;
}

export async function getCompanyContext(db: AdminSupabase, companyId: string): Promise<CompanyContext> {
  const [{ data: company, error }, { data: settings }] = await Promise.all([
    db.from("companies").select("*").eq("id", companyId).single(),
    db.from("company_settings").select("timezone").eq("company_id", companyId).maybeSingle(),
  ]);
  if (error || !company) throw new Error(`회사 정보를 찾을 수 없습니다: ${error?.message ?? companyId}`);
  return {
    id: company.id,
    name: company.name,
    mission: company.mission,
    goals: company.goals,
    brandDirection: company.brand_direction,
    interests: company.interests,
    brandTopics: company.brand_topics,
    researchKeywords: company.research_keywords,
    timezone: settings?.timezone ?? "Asia/Seoul",
  };
}

export function formatCompanyContext(c: CompanyContext): string {
  return [
    `회사명: ${c.name}`,
    c.mission ? `미션: ${c.mission}` : null,
    c.goals ? `회사 목표: ${c.goals}` : null,
    c.brandDirection ? `브랜드 방향: ${c.brandDirection}` : null,
    `CEO 관심 분야: ${c.interests.join(", ") || "(미설정)"}`,
    `브랜드 주제: ${c.brandTopics.join(", ") || "(미설정)"}`,
    `조사 키워드: ${c.researchKeywords.join(", ") || "(미설정)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}
