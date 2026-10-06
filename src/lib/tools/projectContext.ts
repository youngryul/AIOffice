import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";

export async function activeProjects(db: AdminSupabase, companyId: string) {
  const { data } = await db
    .from("projects")
    .select("id, name, goal, research_keywords, auto_research")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

export type ProjectRow = Awaited<ReturnType<typeof activeProjects>>[number];

export function formatProjects(projects: ProjectRow[]): string {
  if (!projects.length) return "(진행 중인 프로젝트 없음)";
  return projects
    .map((p) => `- ${p.name}: ${p.goal ?? ""}${p.research_keywords.length ? ` (키워드: ${p.research_keywords.join(", ")})` : ""}`)
    .join("\n");
}
