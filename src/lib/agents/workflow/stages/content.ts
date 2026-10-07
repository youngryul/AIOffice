import "server-only";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { ContentOutputSchema } from "@/lib/agents/schemas";
import { contentPrompt } from "@/lib/agents/prompts/tasks";
import { contentScore, score20 } from "@/lib/agents/scoring";
import { formatTrends } from "@/lib/tools/trendSearch";
import type { WorkflowContext } from "../context";
import { ensureTask, failTask, updateTask, validIndex } from "../helpers";
import { runTrends } from "./analysis";

function priorityFor(total: number): TablesInsert<"content_ideas">["priority"] {
  if (total >= 85) return "urgent";
  if (total >= 70) return "high";
  if (total >= 50) return "medium";
  return "low";
}

/** Content Factory: Trend → Angle → Instagram / Threads / Blog / Reels */
export async function contentStage(ctx: WorkflowContext) {
  const creator = ctx.byRole("content_strategist") ?? ctx.byRole("brand_strategist");
  if (!creator) {
    ctx.log("콘텐츠 기획자가 없어 콘텐츠 단계를 건너뜁니다.");
    return;
  }
  const trends = (await runTrends(ctx, 8)).sort((a, b) => b.content_score - a.content_score);
  if (!trends.length) {
    ctx.log("검증된 트렌드가 없어 콘텐츠 기획을 건너뜁니다.");
    return;
  }

  const task = await ensureTask(ctx, {
    employeeId: creator.id,
    taskType: "content",
    title: "오늘 주요 트렌드 기반 콘텐츠 기획",
    description: "트렌드를 Instagram / Threads / Blog / Reels 콘텐츠로 변환",
    department: creator.row.department,
  });
  await updateTask(ctx.db, ctx.company.id, task.id, { status: "WORKING", started_at: new Date().toISOString() });
  await creator.setStatus("writing", task.id);

  try {
    const { output } = await creator.run({
      purpose: "content_factory",
      taskId: task.id,
      schema: ContentOutputSchema,
      schemaName: "content_factory",
      include: ["company", "ceoPreferences", "memory"],
      taskPrompt: contentPrompt({ trends: formatTrends(trends, true), brandTopics: ctx.company.brandTopics }),
    });

    const rows: TablesInsert<"content_ideas">[] = output.ideas.map((idea) => {
      const ti = validIndex(idea.trend_index, trends.length);
      const s = idea.scores;
      const total = contentScore(s);
      return {
        company_id: ctx.company.id,
        run_id: ctx.run.id,
        trend_id: ti !== null ? trends[ti].id : null,
        title: idea.title.slice(0, 200),
        trend: idea.trend,
        angle: idea.angle,
        platform: idea.platform,
        content_type: idea.content_type,
        hook: idea.hook,
        body: {
          carousel_title: idea.carousel_title,
          slides: idea.slides.slice(0, 10),
          caption: idea.caption,
          cta: idea.cta,
          hashtags: idea.hashtags.slice(0, 15),
          image_prompt: idea.image_prompt,
          reels_hook: idea.reels_hook,
          reels_script: idea.reels_script,
          outline: idea.outline,
        },
        score_trend: score20(s.trend),
        score_originality: score20(s.originality),
        score_audience_fit: score20(s.audience_fit),
        score_save: score20(s.save_potential),
        score_share: score20(s.share_potential),
        score_brand_fit: score20(s.brand_fit),
        total_score: total,
        priority: priorityFor(total),
        status: "IDEA",
        created_by: creator.id,
      };
    });
    if (rows.length) {
      const { error } = await ctx.db.from("content_ideas").insert(rows);
      if (error) throw new Error(`콘텐츠 아이디어 저장 실패: ${error.message}`);
    }

    await ctx.db.from("task_results").insert({
      company_id: ctx.company.id,
      task_id: task.id,
      employee_id: creator.id,
      stage: "content",
      output: output,
      summary: output.summary,
      review_status: "passed",
      model: creator.model,
    });
    await updateTask(ctx.db, ctx.company.id, task.id, { status: "DONE", completed_at: new Date().toISOString() });
    ctx.log(`✍️ ${creator.name}: 콘텐츠 아이디어 ${rows.length}개 생성`);
  } catch (err) {
    await failTask(ctx, task, err);
  } finally {
    await creator.setStatus("working", null);
  }
}
