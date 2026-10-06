import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";

/** 사내 DB 조회 Tool — 최근 사업 아이디어, 콘텐츠 성과, CEO 결정 */
export async function recentCompanyRecords(db: AdminSupabase, companyId: string): Promise<string> {
  const [opps, posts, decisions] = await Promise.all([
    db
      .from("opportunities")
      .select("title, opportunity_score, status")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(8),
    db
      .from("content_posts")
      .select("platform, views, likes, saves, shares, content_ideas(title)")
      .eq("company_id", companyId)
      .order("recorded_at", { ascending: false })
      .limit(8),
    db
      .from("approvals")
      .select("title, status, decision_note, feedback_tags")
      .eq("company_id", companyId)
      .neq("status", "PENDING")
      .order("decided_at", { ascending: false })
      .limit(8),
  ]);

  const lines: string[] = ["최근 사업 아이디어:"];
  for (const o of opps.data ?? []) lines.push(`- ${o.title} (score ${o.opportunity_score}, ${o.status})`);
  lines.push("최근 콘텐츠 성과:");
  for (const p of posts.data ?? []) {
    const idea = p.content_ideas as { title: string } | null;
    lines.push(`- [${p.platform}] ${idea?.title ?? ""}: 조회 ${p.views}, 좋아요 ${p.likes}, 저장 ${p.saves}, 공유 ${p.shares}`);
  }
  lines.push("최근 CEO 결정:");
  for (const d of decisions.data ?? []) {
    const tags = d.feedback_tags.length ? ` [${d.feedback_tags.join(", ")}]` : "";
    lines.push(`- ${d.title} → ${d.status}${tags}${d.decision_note ? `: ${d.decision_note}` : ""}`);
  }
  return lines.join("\n");
}
