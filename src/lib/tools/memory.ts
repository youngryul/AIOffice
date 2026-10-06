import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import type { MemoryCategory } from "@/lib/types/domain";
import { MEMORY_LABELS } from "@/lib/labels";

/** AI 직원들이 매번 처음부터 판단하지 않도록 회사 기억을 프롬프트에 주입한다. */
export async function getRelevantMemory(
  db: AdminSupabase,
  companyId: string,
  categories?: MemoryCategory[],
  limit = 25,
): Promise<string> {
  let query = db
    .from("company_memory")
    .select("category, content, weight, created_at")
    .eq("company_id", companyId)
    .order("weight", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (categories?.length) query = query.in("category", categories);
  const { data } = await query;
  if (!data?.length) return "(아직 축적된 회사 기억이 없음)";
  return data.map((m) => `- [${MEMORY_LABELS[m.category as MemoryCategory] ?? m.category}] ${m.content}`).join("\n");
}

export async function addMemory(
  db: AdminSupabase,
  params: {
    companyId: string;
    category: MemoryCategory;
    content: string;
    source?: "ceo" | "feedback" | "system" | "agent";
    weight?: number;
    relatedEntityType?: string;
    relatedEntityId?: string;
  },
) {
  const { error } = await db.from("company_memory").insert({
    company_id: params.companyId,
    category: params.category,
    content: params.content.slice(0, 1000),
    source: params.source ?? "system",
    weight: params.weight ?? 1,
    related_entity_type: params.relatedEntityType ?? null,
    related_entity_id: params.relatedEntityId ?? null,
  });
  if (error) console.error("[memory] insert failed", error.message);
}
