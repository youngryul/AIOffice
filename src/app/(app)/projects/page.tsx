import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/services/session";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { ProjectForm } from "./project-form";

export const metadata: Metadata = { title: "프로젝트" };

export default async function ProjectsPage() {
  const { supabase, companyId } = await requireCompany();
  const { data: projects } = await supabase.from("projects").select("*").eq("company_id", companyId).order("created_at", { ascending: false });

  return (
    <div className="grid gap-6">
      <PageHeader title="프로젝트" description="프로젝트를 만들면 AI 리서처들이 관련 정보를 지속적으로 조사합니다." />
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">새 프로젝트</h2>
        <ProjectForm />
      </section>
      {projects?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="grid gap-2 rounded-xl border bg-card p-4 hover:border-primary/50">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                <Badge variant={p.status === "active" ? "success" : "secondary"}>{p.status}</Badge>
              </div>
              {p.goal ? <p className="text-sm text-muted-foreground">{p.goal}</p> : null}
              <p className="text-xs text-muted-foreground">
                {p.auto_research ? "🔍 자동 리서치 · " : ""}
                {formatDate(p.created_at)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon="🚀" title="프로젝트가 없습니다">
          예: &ldquo;AI 외국어 회화 앱 만들기&rdquo;, &ldquo;콘텐츠 자동화 만들기&rdquo;
        </EmptyState>
      )}
    </div>
  );
}
