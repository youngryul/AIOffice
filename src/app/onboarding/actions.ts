"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/services/session";
import { createCompanyForUser, OnboardingSchema } from "@/lib/services/onboarding";
import { errorMessage } from "@/lib/ai/errors";

export async function completeOnboarding(raw: unknown, connectNotion: boolean): Promise<{ error: string } | void> {
  const session = await requireUser();
  const parsed = OnboardingSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요" };
  try {
    // userId 는 서버에서 검증된 세션 값만 사용한다
    await createCompanyForUser(createAdminClient(), session.userId, parsed.data);
  } catch (err) {
    return { error: errorMessage(err) };
  }
  redirect(connectNotion ? "/notion?welcome=1" : "/dashboard?welcome=1");
}
