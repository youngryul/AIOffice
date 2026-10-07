"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/services/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueNotionSync } from "@/lib/tools/notion";
import { addMemory } from "@/lib/tools/memory";
import { recomputeEmployeePerformance } from "@/lib/services/performance";
import { dateInTz } from "@/lib/time";
import { CONTENT_STATUSES } from "@/lib/types/domain";

export interface ContentActionState {
  error?: string;
  ok?: boolean;
}

function refresh(id: string) {
  revalidatePath("/content");
  revalidatePath("/content/calendar");
  revalidatePath(`/content/${id}`);
}

export async function setContentStatus(contentId: string, formData: FormData) {
  const { supabase, companyId } = await requireCompany();
  const status = z.enum(CONTENT_STATUSES).safeParse(formData.get("status"));
  if (!status.success) return;
  await supabase
    .from("content_ideas")
    .update({ status: status.data, ...(status.data === "PUBLISHED" ? { published_at: new Date().toISOString() } : {}) })
    .eq("id", contentId)
    .eq("company_id", companyId);
  await enqueueNotionSync(createAdminClient(), companyId, [{ entityType: "content_idea", entityId: contentId }]);
  refresh(contentId);
}

export async function scheduleContent(contentId: string, _prev: ContentActionState, formData: FormData): Promise<ContentActionState> {
  const { supabase, companyId } = await requireCompany();
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().safeParse(formData.get("date") || null);
  if (!date.success) return { error: "날짜 형식이 올바르지 않습니다." };
  await supabase
    .from("content_ideas")
    .update({ scheduled_for: date.data, ...(date.data ? { status: "SCHEDULED" as const } : {}) })
    .eq("id", contentId)
    .eq("company_id", companyId);
  await enqueueNotionSync(createAdminClient(), companyId, [{ entityType: "content_idea", entityId: contentId }]);
  refresh(contentId);
  return { ok: true };
}

const Metrics = z.object({
  url: z.string().url().optional().or(z.literal("")),
  views: z.coerce.number().int().min(0),
  likes: z.coerce.number().int().min(0),
  comments: z.coerce.number().int().min(0),
  saves: z.coerce.number().int().min(0),
  shares: z.coerce.number().int().min(0),
  followers_gained: z.coerce.number().int().min(0),
});

/** 콘텐츠 성과 기록 → 회사 기억(best/bad content) + 콘텐츠 기획자 성과에 반영 */
export async function recordPerformance(contentId: string, _prev: ContentActionState, formData: FormData): Promise<ContentActionState> {
  const { supabase, companyId, settings } = await requireCompany();
  const parsed = Metrics.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "입력값 오류" };
  const { data: idea } = await supabase.from("content_ideas").select("title, platform, created_by").eq("id", contentId).eq("company_id", companyId).single();
  if (!idea) return { error: "콘텐츠를 찾을 수 없습니다." };

  const m = parsed.data;
  const { error } = await supabase.from("content_posts").insert({
    company_id: companyId,
    content_idea_id: contentId,
    platform: idea.platform,
    url: m.url || null,
    published_at: new Date().toISOString(),
    views: m.views,
    likes: m.likes,
    comments: m.comments,
    saves: m.saves,
    shares: m.shares,
    followers_gained: m.followers_gained,
  });
  if (error) return { error: error.message };
  await supabase.from("content_ideas").update({ status: "PUBLISHED", published_at: new Date().toISOString() }).eq("id", contentId).eq("company_id", companyId);

  const admin = createAdminClient();
  const engagement = m.views > 0 ? (m.likes + m.comments + m.saves + m.shares) / m.views : 0;
  if (m.views > 0) {
    const good = engagement >= 0.05 || m.saves >= 50;
    await addMemory(admin, {
      companyId,
      category: good ? "best_content" : engagement < 0.01 ? "bad_content" : "content_strategy",
      content: `[${idea.platform}] "${idea.title}" — 조회 ${m.views}, 참여율 ${(engagement * 100).toFixed(1)}%, 저장 ${m.saves}, 공유 ${m.shares}`,
      source: "ceo",
      weight: good ? 3 : 1,
      relatedEntityType: "content_idea",
      relatedEntityId: contentId,
    });
  }
  if (idea.created_by) await recomputeEmployeePerformance(admin, companyId, idea.created_by, dateInTz(new Date(), settings.timezone));
  refresh(contentId);
  return { ok: true };
}
