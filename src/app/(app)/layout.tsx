import Link from "next/link";
import { LogOutIcon } from "lucide-react";
import { requireCompany } from "@/lib/services/session";
import { featureFlags } from "@/lib/env";
import { MobileNav, SidebarNav } from "@/components/app/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/app/(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, company, settings, companyId, email } = await requireCompany();
  const { count: pendingApprovals } = await supabase
    .from("approvals")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "PENDING");
  const flags = featureFlags();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card/60 p-4 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-xl" aria-hidden>
            🏢
          </span>
          <span className="grid leading-tight">
            <span className="truncate text-sm font-bold">{company.name}</span>
            <span className="text-xs text-muted-foreground">AI Office</span>
          </span>
        </Link>
        <SidebarNav pendingApprovals={pendingApprovals ?? 0} />
        <div className="mt-auto grid gap-2 border-t pt-4">
          <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <Badge variant={settings.work_mode === "FAST" ? "warning" : "success"}>{settings.work_mode} MODE</Badge>
            <span className="truncate">{email}</span>
          </div>
          <form action={signOut}>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground">
              <LogOutIcon className="size-4" /> 퇴근하기 (로그아웃)
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b bg-card/60 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-bold">🏢 {company.name}</span>
            <form action={signOut}>
              <button className="text-xs text-muted-foreground">로그아웃</button>
            </form>
          </div>
          <MobileNav />
        </header>
        {!flags.openai ? (
          <div className="border-b bg-amber-50 px-6 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            ⚠️ <b>OPENAI_API_KEY</b> 가 설정되지 않아 AI 업무를 실행할 수 없습니다. <code>.env.local</code> 에 키를 추가한 뒤 서버를 재시작하세요. (README 참고)
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
