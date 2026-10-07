import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/services/session";
import { ROLE_CATALOG } from "@/lib/agents/roles";
import { OnboardingWizard } from "./wizard";

export const metadata: Metadata = { title: "온보딩" };

export default async function OnboardingPage() {
  const session = await requireUser();
  if (session.profile?.company_id) {
    const { data: company } = await session.supabase
      .from("companies")
      .select("onboarding_completed")
      .eq("id", session.profile.company_id)
      .maybeSingle();
    if (company?.onboarding_completed) redirect("/dashboard");
  }
  const roles = Object.values(ROLE_CATALOG).map((r) => ({
    key: r.key,
    title: r.title,
    avatar: r.avatar,
    defaultName: r.defaultName,
    description: r.description,
    mvpDefault: r.mvpDefault,
  }));
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,var(--accent),transparent_55%)] px-4 py-10">
      <OnboardingWizard roles={roles} />
    </main>
  );
}
