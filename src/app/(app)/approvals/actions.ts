"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompany } from "@/lib/services/session";
import { decideApproval } from "@/lib/services/approvals";
import { errorMessage } from "@/lib/ai/errors";

const DecisionSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED", "MORE_RESEARCH", "REVISION", "ON_HOLD"]),
  tags: z.array(z.string().max(40)).max(10),
  note: z.string().max(1000).nullable(),
});

export async function decideApprovalAction(input: z.infer<typeof DecisionSchema>): Promise<{ error?: string }> {
  const { companyId } = await requireCompany();
  const parsed = DecisionSchema.safeParse(input);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };
  try {
    await decideApproval(createAdminClient(), { companyId, ...parsed.data, note: parsed.data.note?.trim() || null });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/", "layout");
  return {};
}
