import "server-only";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { ReviewOutputSchema, type ReviewOutput } from "@/lib/agents/schemas";
import { reviewPrompt } from "@/lib/agents/prompts/tasks";
import { groupDuplicates, slugify } from "@/lib/agents/dedupe";
import { growthScore, score100, trendScore } from "@/lib/agents/scoring";
import { embedTexts } from "@/lib/ai/structured";
import type { TrendCategory } from "@/lib/types/domain";
import type { WorkflowContext } from "../context";
import { ensureTask, truncate, updateTask, validIndex } from "../helpers";
import type { SanitizedOutput } from "./research";

type Finding = SanitizedOutput["findings"][number];

interface FlatFinding {
  resultId: string;
  taskId: string;
  employeeId: string | null;
  retrievalAvailable: boolean;
  finding: Finding;
  sources: SanitizedOutput["sources"];
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function majorityCategory(findings: Finding[]): TrendCategory {
  const counts = new Map<TrendCategory, number>();
  for (const f of findings) counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ai_trend";
}

/**
 * Team Review: Duplicate Check → Fact Check → Manager Review → Trend 등록.
 * 팩트체크를 통과하지 못한 Finding 은 트렌드로 등록되지 않으며, CEO 보고서에도 들어가지 않는다.
 */
export async function teamReviewStage(ctx: WorkflowContext) {
  const { data: results, error } = await ctx.db
    .from("task_results")
    .select("id, task_id, employee_id, output, tasks!inner(run_id)")
    .eq("company_id", ctx.company.id)
    .eq("stage", "research")
    .eq("review_status", "pending")
    .eq("tasks.run_id", ctx.run.id);
  if (error) throw new Error(error.message);

  const flat: FlatFinding[] = [];
  for (const r of results ?? []) {
    const out = r.output as unknown as SanitizedOutput & { retrieved_url_count?: number };
    for (const f of out.findings ?? []) {
      flat.push({
        resultId: r.id,
        taskId: r.task_id,
        employeeId: r.employee_id,
        retrievalAvailable: (out.retrieved_url_count ?? 0) > 0,
        finding: f,
        sources: (out.sources ?? []).filter((s) => f.source_urls.includes(s.normalized)),
      });
    }
  }
  if (!flat.length) {
    ctx.log("검토할 Finding 이 없습니다.");
    return;
  }

  // 1) Duplicate Check — URL / 제목 유사도 / 의미 유사도
  const reviewer = ctx.reviewer();
  const embeddings = flat.length > 1 && reviewer
    ? await embedTexts(ctx.db, reviewer.caller(null), flat.map((f) => `${f.finding.title}\n${f.finding.summary}`))
    : null;
  const groups = groupDuplicates(
    flat.map((f, i) => ({ title: f.finding.title, urls: f.finding.source_urls, embedding: embeddings?.[i] })),
  );

  // 2) Fact Check + Manager Review (review 권한이 있는 직원만 수행)
  let review: ReviewOutput | null = null;
  let reviewTaskId: string | null = null;
  if (reviewer) {
    await reviewer.setStatus("approving");
    const reviewTask = await ensureTask(ctx, {
      employeeId: reviewer.id,
      taskType: "review",
      title: "리서치 결과 팩트체크 및 검토",
      description: "출처/날짜/과장/수치/중복/근거 검증 후 트렌드로 정리",
      department: reviewer.row.department,
    });
    reviewTaskId = reviewTask.id;
    await updateTask(ctx.db, ctx.company.id, reviewTask.id, { status: "WORKING", started_at: new Date().toISOString() });

    const findingsText = flat
      .map((f, i) => {
        const src = f.sources.map((s) => `${s.verified ? "[verified]" : "[unverified]"} ${s.publisher ?? ""} ${s.url} (${s.published_at ?? "date?"})`).join("; ");
        return `[${i}] (${f.finding.category}) ${f.finding.title}\n  요약: ${truncate(f.finding.summary, 400)}\n  날짜: ${f.finding.published_date ?? "unknown"} / 추측여부: ${f.finding.is_speculation} / 중요도: ${f.finding.importance}\n  출처: ${src || "(없음)"}`;
      })
      .join("\n");
    const hints = groups
      .map((g, i) => (g !== i ? `[${i}] 은 [${g}] 와 같은 이슈로 보임` : null))
      .filter(Boolean)
      .join("\n");

    try {
      const res = await reviewer.run({
        purpose: "team_review",
        taskId: reviewTask.id,
        schema: ReviewOutputSchema,
        schemaName: "team_review",
        include: ["company", "memory"],
        taskPrompt: reviewPrompt({
          findings: findingsText,
          duplicateHints: hints || "(자동 탐지된 중복 없음)",
          retrievalNote: flat.some((f) => f.retrievalAvailable)
            ? "[verified] 는 실제 웹 검색에서 수집된 URL 과 일치하는 출처다."
            : "이번 검색에서는 URL 수집 정보를 받지 못했다. 출처 URL 의 신뢰도를 직접 판단하라.",
        }),
      });
      review = res.output;
    } catch (err) {
      // 검토자 AI 실패 시 보수적 규칙(검증된 출처만 통과)으로 진행한다.
      ctx.log(`⚠️ AI 검토 실패 → 규칙 기반 검토로 대체: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    ctx.log("⚠️ review 권한을 가진 직원이 없어 규칙 기반 검토만 수행합니다.");
  }

  const reviewByIndex = new Map<number, ReviewOutput["reviews"][number]>();
  for (const r of review?.reviews ?? []) {
    const idx = validIndex(r.finding_index, flat.length);
    if (idx !== null && !reviewByIndex.has(idx)) reviewByIndex.set(idx, r);
  }

  // 3) 판정: AI 판정 + 하드 규칙 (출처 없는 내용은 절대 통과시키지 않는다)
  const verdicts = flat.map((f, i) => {
    const r = reviewByIndex.get(i);
    const hasSource = f.finding.source_urls.length > 0;
    const sourceOk = f.finding.has_verified_source || (!f.retrievalAvailable && hasSource);
    let pass = r ? r.verdict === "pass" : sourceOk;
    const notes: string[] = r ? [r.notes] : ["규칙 기반 검토"];
    if (!hasSource) {
      pass = false;
      notes.push("출처 없음");
    } else if (!sourceOk) {
      pass = false;
      notes.push("검증된 출처 없음");
    }
    const dupOf = validIndex(r?.duplicate_of_index, flat.length);
    return {
      pass,
      notes: notes.filter(Boolean).join(" / "),
      trendName: (r?.trend_name || f.finding.title).slice(0, 120),
      importance: score100(r?.adjusted_importance ?? f.finding.importance),
      leader: dupOf !== null && dupOf !== i ? groups[dupOf] : groups[i],
    };
  });

  // 4) 같은 이슈 → 하나의 Trend 로 묶기
  const trendGroups = new Map<string, number[]>();
  verdicts.forEach((v, i) => {
    if (!v.pass) return;
    const leader = verdicts[v.leader]?.pass ? v.leader : i;
    const name = verdicts[leader].trendName;
    const key = slugify(name) || `trend-${i}`;
    trendGroups.set(key, [...(trendGroups.get(key) ?? []), i]);
  });

  const slugs = [...trendGroups.keys()];
  const { data: existing } = slugs.length
    ? await ctx.db.from("trends").select("*").eq("company_id", ctx.company.id).in("slug", slugs)
    : { data: [] };
  const existingBySlug = new Map((existing ?? []).map((t) => [t.slug, t]));

  const allUrls = [...new Set(flat.flatMap((f) => f.finding.source_urls))];
  const { data: sourceRows } = allUrls.length
    ? await ctx.db.from("sources").select("id, normalized_url").eq("company_id", ctx.company.id).in("normalized_url", allUrls)
    : { data: [] };
  const sourceIdByUrl = new Map((sourceRows ?? []).map((s) => [s.normalized_url, s.id]));

  const nowIso = new Date().toISOString();
  let registered = 0;
  for (const [slug, members] of trendGroups) {
    const fs = members.map((i) => flat[i].finding);
    const leaderIdx = members[0];
    const urls = [...new Set(fs.flatMap((f) => f.source_urls))];
    const mentions = Math.max(fs.length, urls.length, 1);
    const importance = score100(avg(members.map((i) => verdicts[i].importance)));
    const prev = existingBySlug.get(slug);
    const mentionCount = (prev?.mention_count ?? 0) + mentions;
    const scores = {
      novelty: score100(avg(fs.map((f) => f.novelty))),
      business: score100(avg(fs.map((f) => f.business_potential))),
      content: score100(avg(fs.map((f) => f.sns_potential))),
      developer: score100(avg(fs.map((f) => f.developer_impact))),
      growth: growthScore({ mentionCount, previousMentionCount: prev?.mention_count ?? 0, importance }),
    };
    const verified = members.some((i) => flat[i].finding.has_verified_source);
    const tryWorthy = fs.find((f) => f.developer_try_worthy);

    const row: TablesInsert<"trends"> = {
      company_id: ctx.company.id,
      run_id: ctx.run.id,
      slug,
      name: verdicts[leaderIdx].trendName,
      category: majorityCategory(fs),
      summary: flat[leaderIdx].finding.summary,
      importance,
      novelty: scores.novelty,
      growth_score: scores.growth,
      business_score: scores.business,
      content_score: scores.content,
      developer_score: scores.developer,
      current_score: trendScore(scores),
      mention_count: mentionCount,
      practical_value: score100(avg(fs.map((f) => f.practical_value))),
      try_worthy: Boolean(tryWorthy) || Boolean(prev?.try_worthy),
      try_reason: tryWorthy?.try_reason ?? prev?.try_reason ?? null,
      status: prev ? "active" : "new",
      fact_check_status: verified ? "verified" : "unverified",
      fact_check_notes: members.map((i) => verdicts[i].notes).join(" | ").slice(0, 1000),
      discovered_by: prev?.discovered_by ?? flat[leaderIdx].employeeId,
      first_seen_at: prev?.first_seen_at ?? nowIso,
      last_seen_at: nowIso,
    };
    const { data: saved, error: tErr } = await ctx.db
      .from("trends")
      .upsert(row, { onConflict: "company_id,slug" })
      .select("id, current_score, growth_score, mention_count")
      .single();
    if (tErr || !saved) {
      console.error("[team_review] trend upsert failed", tErr?.message);
      continue;
    }
    registered++;

    const links = urls
      .map((u) => sourceIdByUrl.get(u))
      .filter((id): id is string => Boolean(id))
      .map((source_id) => ({ trend_id: saved.id, source_id, company_id: ctx.company.id }));
    if (links.length) await ctx.db.from("trend_sources").upsert(links, { onConflict: "trend_id,source_id", ignoreDuplicates: true });
    await ctx.db.from("trend_snapshots").upsert(
      {
        company_id: ctx.company.id,
        trend_id: saved.id,
        snapshot_date: ctx.today,
        current_score: saved.current_score,
        growth_score: saved.growth_score,
        mention_count: saved.mention_count,
      },
      { onConflict: "trend_id,snapshot_date" },
    );
  }

  // 5) 결과/업무 상태 반영
  const byResult = new Map<string, { passed: number; total: number; taskId: string; notes: string[] }>();
  flat.forEach((f, i) => {
    const entry = byResult.get(f.resultId) ?? { passed: 0, total: 0, taskId: f.taskId, notes: [] };
    entry.total++;
    if (verdicts[i].pass) entry.passed++;
    else entry.notes.push(`✗ ${f.finding.title}: ${verdicts[i].notes}`);
    byResult.set(f.resultId, entry);
  });
  for (const [resultId, e] of byResult) {
    await ctx.db
      .from("task_results")
      .update({
        review_status: e.passed > 0 ? "passed" : "rejected",
        reviewer_id: reviewer?.id ?? null,
        review_notes: `통과 ${e.passed}/${e.total}${e.notes.length ? `\n${e.notes.join("\n")}` : ""}`.slice(0, 4000),
      })
      .eq("id", resultId);
    await updateTask(ctx.db, ctx.company.id, e.taskId, {
      status: e.passed > 0 ? "DONE" : "REJECTED",
      completed_at: nowIso,
    });
  }

  if (reviewTaskId && reviewer) {
    await ctx.db.from("task_results").insert({
      company_id: ctx.company.id,
      task_id: reviewTaskId,
      employee_id: reviewer.id,
      stage: "review",
      output: {
        summary: review?.summary ?? "규칙 기반 검토",
        reviews: verdicts.map((v, i) => ({ finding: flat[i].finding.title, pass: v.pass, trend: v.trendName, notes: v.notes })),
      },
      summary: review?.summary ?? "규칙 기반 검토",
      review_status: "passed",
      model: reviewer.model,
    });
    await updateTask(ctx.db, ctx.company.id, reviewTaskId, { status: "DONE", completed_at: nowIso });
    await reviewer.setStatus("working", null);
  }

  const passed = verdicts.filter((v) => v.pass).length;
  ctx.log(`🔎 Team Review: Finding ${flat.length}개 중 ${passed}개 통과, 트렌드 ${registered}개 등록/갱신`);
}
