import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import type { TrendCategory } from "@/lib/types/domain";

export async function recentTrends(
  db: AdminSupabase,
  companyId: string,
  opts: { category?: TrendCategory; days?: number; limit?: number; verifiedOnly?: boolean; runId?: string } = {},
) {
  const since = new Date(Date.now() - (opts.days ?? 7) * 86_400_000).toISOString();
  let q = db
    .from("trends")
    .select("id, name, category, summary, current_score, importance, business_score, content_score, developer_score, mention_count, try_worthy, try_reason, last_seen_at")
    .eq("company_id", companyId)
    .gte("last_seen_at", since)
    .neq("status", "archived")
    .order("current_score", { ascending: false })
    .limit(opts.limit ?? 10);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.verifiedOnly) q = q.eq("fact_check_status", "verified");
  if (opts.runId) q = q.eq("run_id", opts.runId);
  const { data } = await q;
  return data ?? [];
}

export type TrendRow = Awaited<ReturnType<typeof recentTrends>>[number];

export function formatTrends(trends: TrendRow[], indexed = false): string {
  if (!trends.length) return "(최근 등록된 트렌드 없음)";
  return trends
    .map(
      (t, i) =>
        `${indexed ? `[${i}] ` : "- "}${t.name} (${t.category}, score ${t.current_score}, 언급 ${t.mention_count}회${t.try_worthy ? ", 직접 써볼 가치 있음" : ""}): ${t.summary ?? ""}`,
    )
    .join("\n");
}
