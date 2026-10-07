"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/services/session";
import { PRIORITIES } from "@/lib/types/domain";

export interface TaskActionState {
  error?: string;
  ok?: boolean;
}

const CreateTask = z.object({
  title: z.string().trim().min(2, "업무 제목을 입력하세요").max(200),
  description: z.string().trim().max(2000).optional(),
  assigned_employee: z.string().uuid().optional(),
  priority: z.enum(PRIORITIES).default("high"),
  keywords: z.string().optional(),
  project_id: z.string().uuid().optional(),
});

/**
 * CEO 가 직접 지시하는 조사 업무. run_id 없이 TODO 로 저장되고,
 * 다음 업무 사이클의 Morning Meeting 에서 비서실장이 오늘 업무로 편입한다.
 */
export async function createTask(_prev: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const { supabase, companyId } = await requireCompany();
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => v !== ""));
  const parsed = CreateTask.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  let department = "research";
  if (d.assigned_employee) {
    const { data: emp } = await supabase.from("employees").select("department").eq("id", d.assigned_employee).eq("company_id", companyId).maybeSingle();
    if (!emp) return { error: "직원을 찾을 수 없습니다." };
    department = emp.department;
  }
  const { error } = await supabase.from("tasks").insert({
    company_id: companyId,
    title: d.title,
    description: d.description ?? null,
    assigned_employee: d.assigned_employee ?? null,
    priority: d.priority,
    department,
    task_type: "research",
    keywords: (d.keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean).slice(0, 8),
    created_by: "ceo",
    source: d.project_id ? "project" : "ceo",
    project_id: d.project_id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  if (d.project_id) revalidatePath(`/projects/${d.project_id}`);
  return { ok: true };
}

export async function deleteTask(taskId: string) {
  const { supabase, companyId } = await requireCompany();
  await supabase.from("tasks").delete().eq("id", taskId).eq("company_id", companyId).is("run_id", null);
  revalidatePath("/tasks");
}
