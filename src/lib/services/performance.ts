import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { isPromotionCandidate, overallPerformance, score100 } from "@/lib/agents/scoring";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * 직원 성과 재계산 (최근 30일).
 * Accuracy · CEO Approval Rate · Useful Insight · Originality · Task Completion · Content Performance
 */
export async function recomputeEmployeePerformance(db: AdminSupabase, companyId: string, employeeId: string, today: string) {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: emp }, results, tasks, approvals, trends, opps, contents, prevRating] = await Promise.all([
    db.from("employees").select("level, role").eq("id", employeeId).eq("company_id", companyId).single(),
    db.from("task_results").select("stage, review_status, confidence").eq("company_id", companyId).eq("employee_id", employeeId).gte("created_at", since),
    db.from("tasks").select("status").eq("company_id", companyId).eq("assigned_employee", employeeId).gte("created_at", since),
    db.from("approvals").select("status").eq("company_id", companyId).eq("employee_id", employeeId).neq("status", "PENDING").gte("created_at", since),
    db.from("trends").select("current_score, novelty").eq("company_id", companyId).eq("discovered_by", employeeId).gte("last_seen_at", since),
    db.from("opportunities").select("opportunity_score").eq("company_id", companyId).eq("created_by", employeeId).gte("created_at", since),
    db
      .from("content_ideas")
      .select("total_score, score_originality, content_posts(views, likes, comments, saves, shares)")
      .eq("company_id", companyId)
      .eq("created_by", employeeId)
      .gte("created_at", since),
    db.from("employee_performance").select("ceo_rating").eq("employee_id", employeeId).not("ceo_rating", "is", null).order("period_date", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!emp) return;

  const reviewed = (results.data ?? []).filter((r) => r.review_status !== "pending");
  const accuracy = reviewed.length ? (reviewed.filter((r) => r.review_status === "passed").length / reviewed.length) * 100 : 0;

  const decided = approvals.data ?? [];
  const approvalRate = decided.length ? (decided.filter((a) => a.status === "APPROVED").length / decided.length) * 100 : 0;

  const finished = (tasks.data ?? []).filter((t) => ["DONE", "FAILED", "REJECTED", "APPROVED"].includes(t.status));
  const taskCompletion = finished.length ? (finished.filter((t) => t.status === "DONE" || t.status === "APPROVED").length / finished.length) * 100 : 0;

  const usefulInsight =
    avg([
      ...(trends.data ?? []).map((t) => t.current_score),
      ...(opps.data ?? []).map((o) => o.opportunity_score),
      ...(contents.data ?? []).map((c) => c.total_score),
    ]) ??
    avg((results.data ?? []).map((r) => Number(r.confidence ?? 0))) ??
    0;

  const originality =
    avg([...(trends.data ?? []).map((t) => t.novelty), ...(contents.data ?? []).map((c) => c.score_originality * 5)]) ?? 50;

  const posts = (contents.data ?? []).flatMap((c) => c.content_posts ?? []);
  const engagement = posts.filter((p) => p.views > 0).map((p) => (p.likes + p.comments + p.saves + p.shares) / p.views);
  const contentPerformance = engagement.length ? Math.min(100, (avg(engagement) ?? 0) * 1000) : 50;

  let overall = overallPerformance({
    accuracy,
    approvalRate,
    usefulInsight,
    originality,
    taskCompletion,
    contentPerformance,
  });
  const ceoRating = prevRating.data?.ceo_rating ?? null;
  if (ceoRating) overall = score100(overall * 0.8 + ceoRating * 20 * 0.2);

  const completedTasks = finished.filter((t) => t.status === "DONE" || t.status === "APPROVED").length;
  const candidate = isPromotionCandidate({ overall, approvalRate, accuracy, completedTasks, level: emp.level });

  await db.from("employee_performance").upsert(
    {
      company_id: companyId,
      employee_id: employeeId,
      period_date: today,
      accuracy: score100(accuracy),
      approval_rate: score100(approvalRate),
      useful_insight: score100(usefulInsight),
      originality: score100(originality),
      task_completion: score100(taskCompletion),
      content_performance: score100(contentPerformance),
      overall,
      ceo_rating: ceoRating,
    },
    { onConflict: "employee_id,period_date" },
  );
  await db
    .from("employees")
    .update({
      accuracy_score: score100(accuracy),
      approval_rate: score100(approvalRate),
      performance_score: overall,
      promotion_candidate: candidate,
    })
    .eq("id", employeeId)
    .eq("company_id", companyId);
}
