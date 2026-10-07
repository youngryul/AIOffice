import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { callStructured } from "@/lib/ai/structured";
import { modelFor } from "@/lib/agents/agent";
import { MemorySummarySchema } from "@/lib/agents/schemas";
import { feedbackLessonPrompt } from "@/lib/agents/prompts/tasks";
import { addMemory } from "@/lib/tools/memory";
import { enqueueNotionSync, type NotionEntityType } from "@/lib/tools/notion";
import { dateInTz } from "@/lib/time";
import type { ApprovalStatus, MemoryCategory } from "@/lib/types/domain";
import { APPROVAL_STATUS_LABELS } from "@/lib/labels";
import { recomputeEmployeePerformance } from "./performance";

export type Decision = Exclude<ApprovalStatus, "PENDING">;

/**
 * CEO 결재 → Execution → Archive(company_memory) → Notion Sync.
 */
export async function decideApproval(
  db: AdminSupabase,
  params: { companyId: string; approvalId: string; decision: Decision; tags: string[]; note: string | null },
) {
  const { companyId, approvalId, decision, tags, note } = params;
  const { data: approval, error } = await db
    .from("approvals")
    .update({ status: decision, feedback_tags: tags, decision_note: note, decided_at: new Date().toISOString() })
    .eq("id", approvalId)
    .eq("company_id", companyId)
    .select("*")
    .single();
  if (error || !approval) throw new Error("결재 안건을 찾을 수 없습니다.");

  const notionItems: { entityType: NotionEntityType; entityId: string }[] = [{ entityType: "approval", entityId: approval.id }];

  // ---- Execution ----
  const relId = approval.related_entity_id;
  if (approval.related_entity_type === "opportunity" && relId) {
    const status = decision === "APPROVED" ? "RESEARCHING" : decision === "REJECTED" ? "ARCHIVED" : null;
    if (status) await db.from("opportunities").update({ status }).eq("id", relId).eq("company_id", companyId);
    notionItems.push({ entityType: "opportunity", entityId: relId });
  }
  if (approval.related_entity_type === "content_idea" && relId) {
    const status = decision === "APPROVED" ? "WRITING" : decision === "REJECTED" || decision === "REVISION" ? "IDEA" : null;
    if (status) await db.from("content_ideas").update({ status }).eq("id", relId).eq("company_id", companyId);
    notionItems.push({ entityType: "content_idea", entityId: relId });
  }
  if (approval.related_entity_type === "trend" && relId) {
    if (decision === "APPROVED") await db.from("trends").update({ status: "watching" }).eq("id", relId).eq("company_id", companyId);
    notionItems.push({ entityType: "trend", entityId: relId });
  }

  if (decision === "MORE_RESEARCH" || decision === "REVISION") {
    // 다음 업무 사이클의 Morning Meeting 에서 자동으로 편입되는 후속 조사 업무
    const { data: researcher } = await db
      .from("employees")
      .select("id, department")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .in("role", ["ai_trend_researcher", "vibe_coding_researcher", "market_researcher"])
      .order("level", { ascending: false })
      .limit(1)
      .maybeSingle();
    await db.from("tasks").insert({
      company_id: companyId,
      title: `${decision === "MORE_RESEARCH" ? "추가 조사" : "수정 요청 반영"}: ${approval.title}`.slice(0, 200),
      description: `CEO 지시: ${note ?? APPROVAL_STATUS_LABELS[decision]}\n\n원 안건 요약: ${approval.summary ?? ""}`,
      department: researcher?.department ?? "research",
      task_type: "research",
      assigned_employee: researcher?.id ?? null,
      priority: "high",
      keywords: approval.title.replace(/\[.*?\]/g, "").split(/\s+/).filter((w) => w.length > 1).slice(0, 5),
      created_by: "ceo",
      source: "approval_followup",
      project_id: approval.project_id,
    });
  }

  // 같은 Run 의 결재가 모두 끝나면 비서실장의 보고 업무를 완료 처리
  if (approval.run_id) {
    const { count } = await db
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("run_id", approval.run_id)
      .eq("status", "PENDING");
    if ((count ?? 0) === 0) {
      await db
        .from("tasks")
        .update({ status: "DONE" })
        .eq("company_id", companyId)
        .eq("run_id", approval.run_id)
        .eq("status", "APPROVAL");
    }
  }

  // ---- Archive: CEO 피드백 학습 ----
  const category: MemoryCategory =
    decision === "APPROVED" ? "approved_ideas" : decision === "REJECTED" ? "rejected_ideas" : "past_decisions";
  const lesson = await summarizeLesson(db, companyId, {
    title: approval.title,
    summary: approval.summary ?? "",
    decision: APPROVAL_STATUS_LABELS[decision],
    tags,
    note,
  });
  await addMemory(db, {
    companyId,
    category: lesson?.category ?? category,
    content: lesson?.lesson ?? `${approval.title} → ${APPROVAL_STATUS_LABELS[decision]}${tags.length ? ` (${tags.join(", ")})` : ""}${note ? `: ${note}` : ""}`,
    source: "feedback",
    weight: tags.length || note ? 3 : 2,
    relatedEntityType: "approval",
    relatedEntityId: approval.id,
  });
  if (category !== "past_decisions") {
    await addMemory(db, {
      companyId,
      category: "past_decisions",
      content: `${approval.title} → ${APPROVAL_STATUS_LABELS[decision]}`,
      source: "system",
      relatedEntityType: "approval",
      relatedEntityId: approval.id,
    });
  }

  await enqueueNotionSync(db, companyId, notionItems);

  if (approval.employee_id) {
    const { data: settings } = await db.from("company_settings").select("timezone").eq("company_id", companyId).single();
    await recomputeEmployeePerformance(db, companyId, approval.employee_id, dateInTz(new Date(), settings?.timezone ?? "Asia/Seoul"));
  }
  return approval;
}

/** CEO 피드백을 한 문장 교훈으로 요약 (실패해도 결재는 진행된다) */
async function summarizeLesson(
  db: AdminSupabase,
  companyId: string,
  p: { title: string; summary: string; decision: string; tags: string[]; note: string | null },
) {
  if (!env().OPENAI_API_KEY || (!p.tags.length && !p.note)) return null;
  try {
    const [{ data: cos }, { data: settings }] = await Promise.all([
      db.from("employees").select("*").eq("company_id", companyId).eq("role", "chief_of_staff").eq("is_active", true).limit(1).maybeSingle(),
      db.from("company_settings").select("timezone").eq("company_id", companyId).single(),
    ]);
    const { output } = await callStructured({
      db,
      caller: {
        companyId,
        timezone: settings?.timezone ?? "Asia/Seoul",
        runId: null,
        taskId: null,
        employeeId: cos?.id ?? null,
        agent: "chief_of_staff",
        model: cos ? modelFor(cos) : env().AI_MODEL_JUNIOR,
        maxOutputTokens: 2000,
        dailyBudget: cos ? Number(cos.daily_budget) : null,
      },
      purpose: "feedback_lesson",
      schema: MemorySummarySchema,
      schemaName: "feedback_lesson",
      instructions: "너는 CEO 의 결재 피드백을 회사 기억으로 정리하는 비서실장이다. 한국어 한 문장으로 쓴다.",
      input: feedbackLessonPrompt(p),
    });
    return output;
  } catch {
    return null;
  }
}
