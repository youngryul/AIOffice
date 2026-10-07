"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/services/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueNotionSync } from "@/lib/tools/notion";
import { addMemory } from "@/lib/tools/memory";
import { OPPORTUNITY_STATUSES } from "@/lib/types/domain";

export async function setOpportunityStatus(opportunityId: string, formData: FormData) {
  const { supabase, companyId } = await requireCompany();
  const status = z.enum(OPPORTUNITY_STATUSES).safeParse(formData.get("status"));
  if (!status.success) return;
  const { data } = await supabase
    .from("opportunities")
    .update({ status: status.data })
    .eq("id", opportunityId)
    .eq("company_id", companyId)
    .select("title")
    .single();
  const admin = createAdminClient();
  if (data && status.data === "ARCHIVED") {
    // 사업 아이디어 보관 → 회사 기억
    await addMemory(admin, { companyId, category: "business_interests", content: `보관한 사업 아이디어: ${data.title}`, source: "ceo", relatedEntityType: "opportunity", relatedEntityId: opportunityId });
  }
  await enqueueNotionSync(admin, companyId, [{ entityType: "opportunity", entityId: opportunityId }]);
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
}
