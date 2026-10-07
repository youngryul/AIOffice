import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompany } from "@/lib/services/session";
import { RESEARCH_ROLES, ROLE_CATALOG } from "@/lib/agents/roles";
import { APPROVAL_STATUS_LABELS, PLATFORM_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import type { ApprovalStatus, Platform, RoleKey, TaskStatus } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScorePill } from "@/components/ui/misc";
import { StatusSelect } from "@/components/app/status-select";
import { TaskForm } from "../../tasks/task-form";
import { setProjectMembers, setProjectStatus } from "../actions";

export const metadata: Metadata = { title: "프로젝트 상세" };

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid content-start gap-2 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const Empty = () => <p className="text-sm text-muted-foreground">없음</p>;

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, companyId } = await requireCompany();
  const { data: p } = await supabase.from("projects").select("*").eq("id", id).eq("company_id", companyId).maybeSingle();
  if (!p) notFound();

  // 키워드와 관련된 트렌드를 Research 섹션에 보여준다
  const keywordFilter = p.research_keywords
    .slice(0, 5)
    .map((k) => `name.ilike.%${k.replace(/[%,()]/g, " ")}%`)
    .join(",");

  const [members, employees, tasks, opps, contents, meetings, approvals, trends] = await Promise.all([
    supabase.from("project_members").select("employee_id").eq("project_id", id).eq("company_id", companyId),
    supabase.from("employees").select("id, name, avatar, role").eq("company_id", companyId).eq("is_active", true),
    supabase.from("tasks").select("id, title, status").eq("company_id", companyId).eq("project_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("opportunities").select("id, title, opportunity_score").eq("company_id", companyId).eq("project_id", id),
    supabase.from("content_ideas").select("id, title, platform, total_score").eq("company_id", companyId).eq("project_id", id),
    supabase.from("meetings").select("id, topic").eq("company_id", companyId).eq("project_id", id),
    supabase.from("approvals").select("id, title, status").eq("company_id", companyId).eq("project_id", id),
    keywordFilter
      ? supabase.from("trends").select("id, name, current_score").eq("company_id", companyId).or(keywordFilter).order("current_score", { ascending: false }).limit(10)
      : Promise.resolve({ data: [] as { id: string; name: string; current_score: number }[] }),
  ]);
  const memberIds = new Set((members.data ?? []).map((m) => m.employee_id));

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border bg-card p-5">
        <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground">
          ← 프로젝트
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{p.name}</h1>
            <p className="mt-1 text-sm">
              <b>Goal</b> {p.goal ?? "-"}
            </p>
            {p.description ? <p className="mt-1 text-sm text-muted-foreground">{p.description}</p> : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {p.research_keywords.map((k) => (
                <Badge key={k} variant="secondary">
                  #{k}
                </Badge>
              ))}
            </div>
          </div>
          <StatusSelect
            label="프로젝트 상태"
            value={p.status}
            options={[
              { value: "active", label: "진행 중" },
              { value: "paused", label: "일시 중지" },
              { value: "done", label: "완료" },
            ]}
            action={setProjectStatus.bind(null, p.id)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Research (관련 트렌드)">
          {trends.data?.length ? (
            <ul className="grid gap-1 text-sm">
              {trends.data.map((t) => (
                <li key={t.id} className="flex justify-between gap-2">
                  <Link href={`/trends/${t.id}`} className="hover:underline">
                    {t.name}
                  </Link>
                  <ScorePill value={t.current_score} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Ideas">
          {opps.data?.length ? (
            <ul className="grid gap-1 text-sm">
              {opps.data.map((o) => (
                <li key={o.id} className="flex justify-between gap-2">
                  <Link href={`/opportunities/${o.id}`} className="hover:underline">
                    {o.title}
                  </Link>
                  <ScorePill value={o.opportunity_score} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Tasks">
          {tasks.data?.length ? (
            <ul className="grid gap-1 text-sm">
              {tasks.data.map((t) => (
                <li key={t.id} className="flex justify-between gap-2">
                  <span>{t.title}</span>
                  <Badge variant="outline">{TASK_STATUS_LABELS[t.status as TaskStatus]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Meetings">
          {meetings.data?.length ? (
            <ul className="grid gap-1 text-sm">
              {meetings.data.map((m) => (
                <li key={m.id}>
                  <Link href={`/meetings?id=${m.id}`} className="hover:underline">
                    {m.topic}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Decisions">
          {approvals.data?.length ? (
            <ul className="grid gap-1 text-sm">
              {approvals.data.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span>{a.title}</span>
                  <Badge variant="outline">{APPROVAL_STATUS_LABELS[a.status as ApprovalStatus]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Content">
          {contents.data?.length ? (
            <ul className="grid gap-1 text-sm">
              {contents.data.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <Link href={`/content/${c.id}`} className="hover:underline">
                    [{PLATFORM_LABELS[c.platform as Platform]}] {c.title}
                  </Link>
                  <ScorePill value={c.total_score} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">프로젝트 멤버</h2>
          <form action={setProjectMembers.bind(null, p.id)} className="grid gap-2">
            {(employees.data ?? []).map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="members" value={e.id} defaultChecked={memberIds.has(e.id)} className="size-4" />
                {e.avatar} {e.name} <span className="text-xs text-muted-foreground">{ROLE_CATALOG[e.role as RoleKey].title}</span>
              </label>
            ))}
            <Button size="sm" variant="outline" className="w-fit">
              멤버 저장
            </Button>
          </form>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">프로젝트 조사 지시</h2>
          <TaskForm
            projectId={p.id}
            employees={(employees.data ?? [])
              .filter((e) => RESEARCH_ROLES.includes(e.role as RoleKey))
              .map((e) => ({ id: e.id, label: `${e.avatar} ${e.name}` }))}
          />
        </section>
      </div>
    </div>
  );
}
