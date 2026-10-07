"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCompany } from "@/lib/services/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueNotionSync } from "@/lib/tools/notion";

export interface ProjectActionState {
  error?: string;
}

const ProjectSchema = z.object({
  name: z.string().trim().min(1, "프로젝트 이름을 입력하세요").max(100),
  goal: z.string().trim().max(500).optional(),
  description: z.string().trim().max(2000).optional(),
  keywords: z.string().optional(),
  auto_research: z.string().optional(),
});

export async function createProject(_prev: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const { supabase, companyId } = await requireCompany();
  const parsed = ProjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const { data, error } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      name: d.name,
      goal: d.goal || null,
      description: d.description || null,
      research_keywords: (d.keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean).slice(0, 15),
      auto_research: d.auto_research === "on",
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "생성 실패" };
  // 진행 중 프로젝트는 회사 기억에도 남겨 AI 판단에 반영
  await supabase.from("company_memory").insert({ company_id: companyId, category: "current_projects", content: `${d.name}: ${d.goal ?? ""}`, source: "ceo", weight: 2, related_entity_type: "project", related_entity_id: data.id });
  await enqueueNotionSync(createAdminClient(), companyId, [{ entityType: "project", entityId: data.id }]);
  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function setProjectStatus(projectId: string, formData: FormData) {
  const { supabase, companyId } = await requireCompany();
  const status = z.enum(["active", "paused", "done"]).safeParse(formData.get("status"));
  if (!status.success) return;
  await supabase.from("projects").update({ status: status.data }).eq("id", projectId).eq("company_id", companyId);
  await enqueueNotionSync(createAdminClient(), companyId, [{ entityType: "project", entityId: projectId }]);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function setProjectMembers(projectId: string, formData: FormData) {
  const { supabase, companyId } = await requireCompany();
  const ids = formData.getAll("members").map(String).filter((v) => z.string().uuid().safeParse(v).success);
  await supabase.from("project_members").delete().eq("project_id", projectId).eq("company_id", companyId);
  if (ids.length) {
    await supabase.from("project_members").insert(ids.map((employee_id) => ({ project_id: projectId, employee_id, company_id: companyId })));
  }
  revalidatePath(`/projects/${projectId}`);
}
