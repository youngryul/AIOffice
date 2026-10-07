import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 현재 로그인한 CEO 와 회사.
 * company_id 는 항상 서버에서 profiles 를 통해 얻는다 — 요청 파라미터로 받지 않는다.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return { supabase, userId, email: (claims?.claims?.email as string | undefined) ?? profile?.email ?? null, profile };
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export const requireCompany = cache(async () => {
  const session = await requireUser();
  const companyId = session.profile?.company_id;
  if (!companyId) redirect("/onboarding");
  const [{ data: company }, { data: settings }] = await Promise.all([
    session.supabase.from("companies").select("*").eq("id", companyId).single(),
    session.supabase.from("company_settings").select("*").eq("company_id", companyId).single(),
  ]);
  if (!company || !settings) redirect("/onboarding");
  if (!company.onboarding_completed) redirect("/onboarding");
  return { ...session, companyId, company, settings };
});

export type CompanySession = Awaited<ReturnType<typeof requireCompany>>;
