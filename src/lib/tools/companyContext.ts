import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { parseReferenceSites, type ReferenceSite } from "@/lib/reference-sites";

export interface CompanyContext {
  id: string;
  name: string;
  mission: string | null;
  goals: string | null;
  brandDirection: string | null;
  interests: string[];
  brandTopics: string[];
  researchKeywords: string[];
  /** CEO 가 운영하는 웹사이트 — 조사 시 함께 참고한다 */
  referenceSites: ReferenceSite[];
  timezone: string;
}

export async function getCompanyContext(db: AdminSupabase, companyId: string): Promise<CompanyContext> {
  const [{ data: company, error }, { data: settings }] = await Promise.all([
    db.from("aio_companies").select("*").eq("id", companyId).single(),
    db.from("aio_company_settings").select("timezone").eq("company_id", companyId).maybeSingle(),
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
    referenceSites: parseReferenceSites(company.reference_sites),
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
    c.referenceSites.length
      ? `참고 사이트 (CEO 가 운영하는 사이트 — 조사 시 우선 확인):\n${c.referenceSites
          .map((s) => `- ${s.label ? `${s.label}: ` : ""}${s.url}`)
          .join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
