import { redirect } from "next/navigation";
import { getSession } from "@/lib/services/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(session.profile?.company_id ? "/dashboard" : "/onboarding");
}
