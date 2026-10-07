import type { Metadata } from "next";
import { requireCompany } from "@/lib/services/session";
import { RESEARCH_ROLES, ROLE_CATALOG } from "@/lib/agents/roles";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import { TASK_STATUSES, type RoleKey, type TaskStatus } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";
import { TaskForm } from "./task-form";
import { deleteTask } from "./actions";

export const metadata: Metadata = { title: "업무" };

const PRIORITY_LABEL = { urgent: "긴급", high: "높음", medium: "보통", low: "낮음" } as const;

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { supabase, companyId } = await requireCompany();
  const filter = TASK_STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : null;

  let q = supabase
    .from("tasks")
    .select("*, employees:assigned_employee(name, avatar)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter) q = q.eq("status", filter);
  const [{ data: tasks }, { data: employees }] = await Promise.all([
    q,
    supabase.from("employees").select("id, name, avatar, role").eq("company_id", companyId).eq("is_active", true),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader title="업무 (Tasks)" description="TODO → WORKING → REVIEW → MEETING → APPROVAL → DONE. CEO 가 직접 업무를 지시할 수도 있습니다." />
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">추가 조사 지시</h2>
        <TaskForm
          employees={(employees ?? [])
            .filter((e) => RESEARCH_ROLES.includes(e.role as RoleKey))
            .map((e) => ({ id: e.id, label: `${e.avatar} ${e.name} (${ROLE_CATALOG[e.role as RoleKey].title})` }))}
        />
      </section>

      <nav className="flex flex-wrap gap-1.5" aria-label="상태 필터">
        <a href="/tasks" className={`rounded-full border px-3 py-1 text-xs ${!filter ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
          전체
        </a>
        {TASK_STATUSES.map((s) => (
          <a key={s} href={`/tasks?status=${s}`} className={`rounded-full border px-3 py-1 text-xs ${filter === s ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            {TASK_STATUS_LABELS[s]}
          </a>
        ))}
      </nav>

      {tasks?.length ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">업무</th>
                <th className="px-4 py-2 font-medium">담당</th>
                <th className="px-4 py-2 font-medium">우선순위</th>
                <th className="px-4 py-2 font-medium">상태</th>
                <th className="px-4 py-2 font-medium">출처</th>
                <th className="px-4 py-2 font-medium">갱신</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.map((t) => {
                const emp = t.employees as { name: string; avatar: string } | null;
                return (
                  <tr key={t.id} className="align-top">
                    <td className="max-w-md px-4 py-2.5">
                      <p className="font-medium">{t.title}</p>
                      {t.keywords.length ? <p className="text-xs text-muted-foreground">#{t.keywords.join(" #")}</p> : null}
                      {t.last_error ? (
                        <p className="text-xs text-rose-600">
                          ⚠ {t.last_error} (retry {t.retry_count})
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{emp ? `${emp.avatar} ${emp.name}` : "미배정"}</td>
                    <td className="px-4 py-2.5">{PRIORITY_LABEL[t.priority as keyof typeof PRIORITY_LABEL]}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={t.status === "DONE" || t.status === "APPROVED" ? "success" : t.status === "FAILED" || t.status === "REJECTED" ? "danger" : t.status === "TODO" ? "outline" : "warning"}>
                        {TASK_STATUS_LABELS[t.status as TaskStatus]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.source}</td>
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(t.updated_at)}</td>
                    <td className="px-4 py-2.5">
                      {!t.run_id && t.status === "TODO" ? (
                        <form action={deleteTask.bind(null, t.id)}>
                          <Button size="sm" variant="ghost">
                            취소
                          </Button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="📋" title="업무가 없습니다">
          &ldquo;오늘 업무 실행&rdquo; 을 누르면 비서실장이 Morning Meeting 에서 업무를 배분합니다.
        </EmptyState>
      )}
    </div>
  );
}
