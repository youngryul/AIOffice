import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { ROLE_CATALOG, DEPARTMENT_LABELS } from "@/lib/agents/roles";
import { POSITION_CONFIG } from "@/lib/agents/positions";
import { EMPLOYEE_STATUS_META } from "@/lib/labels";
import type { Department, EmployeeStatus, Position, RoleKey } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { PageHeader, ScoreBar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils";
import { HireForm } from "./hire-form";
import { rehireEmployee } from "./actions";

export const metadata: Metadata = { title: "직원" };

export default async function EmployeesPage() {
  const { supabase, companyId } = await requireCompany();
  const { data: employees } = await supabase.from("employees").select("*").eq("company_id", companyId).order("level", { ascending: false });
  const active = (employees ?? []).filter((e) => e.is_active);
  const former = (employees ?? []).filter((e) => !e.is_active);

  return (
    <div className="grid gap-8">
      <PageHeader title="AI 직원" description="직급은 권한입니다 — 높을수록 더 좋은 모델, 더 큰 token budget, 더 많은 Tool, 검토 권한을 가집니다." />

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">AI 직원 채용</h2>
        <HireForm
          roles={Object.values(ROLE_CATALOG).map((r) => ({ key: r.key, label: `${r.avatar} ${r.title}` }))}
          positions={Object.entries(POSITION_CONFIG).map(([key, c]) => ({ key, label: `${c.label} (Lv.${c.level})` }))}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {active.map((e) => {
          const meta = EMPLOYEE_STATUS_META[e.status as EmployeeStatus];
          return (
            <Link key={e.id} href={`/employees/${e.id}`} className="grid gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-2xl" aria-hidden>
                  {e.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{e.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{ROLE_CATALOG[e.role as RoleKey].title}</p>
                </div>
                {e.promotion_candidate ? <Badge variant="success">승진 후보</Badge> : null}
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="outline">{POSITION_CONFIG[e.position as Position].label}</Badge>
                <Badge variant="secondary">{DEPARTMENT_LABELS[e.department as Department]}</Badge>
                <span className={`rounded-md px-2 py-0.5 ${meta.tone}`}>
                  {meta.emoji} {meta.label}
                </span>
              </div>
              <div className="grid gap-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>종합 성과</span>
                  <span className="tabular-nums">{Math.round(Number(e.performance_score))}</span>
                </div>
                <ScoreBar value={Number(e.performance_score)} />
              </div>
              <p className="text-xs text-muted-foreground">
                모델 {e.model ?? "직급 기본"} · 일일 예산 {formatUsd(e.daily_budget)} · max {e.token_budget.toLocaleString()} tokens
              </p>
            </Link>
          );
        })}
      </section>

      {former.length ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">퇴사한 직원</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {former.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  {e.avatar} {e.name} · {ROLE_CATALOG[e.role as RoleKey].title}
                </span>
                <form action={rehireEmployee.bind(null, e.id)}>
                  <Button size="sm" variant="outline">
                    재고용
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
