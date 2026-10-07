import type { Metadata } from "next";
import { requireCompany } from "@/lib/services/session";
import { featureFlags } from "@/lib/env";
import { resolveSchedule } from "@/lib/schedule";
import { MEMORY_LABELS } from "@/lib/labels";
import type { MemoryCategory } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { deleteMemoryItem } from "./actions";
import { CompanyForm, MemoryForm, WorkSettingsForm } from "./settings-forms";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const { supabase, companyId, company, settings } = await requireCompany();
  const { data: memory } = await supabase
    .from("company_memory")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(60);
  const flags = featureFlags();

  return (
    <div className="grid gap-6">
      <PageHeader title="설정" />

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">회사 목표 · 브랜드 · 조사 키워드</h2>
        <CompanyForm
          name={company.name}
          mission={company.mission}
          goals={company.goals}
          brand_direction={company.brand_direction}
          interests={company.interests}
          brand_topics={company.brand_topics}
          research_keywords={company.research_keywords}
        />
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">업무시간 · 모드 · 예산</h2>
        <WorkSettingsForm
          timezone={settings.timezone}
          work_mode={settings.work_mode as "REAL" | "FAST"}
          monthly_budget_usd={Number(settings.monthly_budget_usd)}
          ai_enabled={settings.ai_enabled}
          workdays={settings.workdays}
          schedule={resolveSchedule(settings.schedule)}
        />
        {settings.work_mode === "REAL" && !flags.cron ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            REAL MODE 는 Cron 이 <code>/api/cron/tick</code> 을 호출해야 동작합니다. CRON_SECRET 환경변수와 Supabase Cron / Vercel Cron 을 설정하세요 (README).
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        <div>
          <h2 className="font-semibold">회사 기억 (Company Memory)</h2>
          <p className="text-sm text-muted-foreground">AI 직원들이 매번 처음부터 판단하지 않도록 프롬프트에 주입됩니다. 결재 피드백과 콘텐츠 성과도 자동으로 쌓입니다.</p>
        </div>
        <MemoryForm />
        {memory?.length ? (
          <ul className="divide-y rounded-lg border">
            {memory.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <Badge variant="secondary">{MEMORY_LABELS[m.category as MemoryCategory]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {m.source} · {formatDate(m.created_at)}
                    </span>
                  </div>
                  <p>{m.content}</p>
                </div>
                <form action={deleteMemoryItem.bind(null, m.id)}>
                  <Button size="sm" variant="ghost" aria-label="삭제">
                    ✕
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">아직 회사 기억이 없습니다.</p>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-semibold">시스템 상태</h2>
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          {(
            [
              ["OpenAI API", flags.openai],
              ["Tavily 검색 API (선택)", flags.tavily],
              ["Notion OAuth (선택)", flags.notionOAuth],
              ["Notion 환경변수 토큰 (선택)", flags.notionEnvToken],
              ["토큰 암호화 키 (APP_ENCRYPTION_KEY)", flags.encryption],
              ["Cron Secret (REAL MODE)", flags.cron],
            ] as const
          ).map(([label, ok]) => (
            <li key={label} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span>{label}</span>
              <Badge variant={ok ? "success" : "outline"}>{ok ? "설정됨" : "미설정"}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
