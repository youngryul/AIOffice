import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompany } from "@/lib/services/session";
import { CONTENT_STATUS_LABELS, PLATFORM_LABELS } from "@/lib/labels";
import { CONTENT_STATUSES, type Platform } from "@/lib/types/domain";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/misc";
import { StatusSelect } from "@/components/app/status-select";
import { formatDate } from "@/lib/utils";
import { setContentStatus } from "../actions";
import { PerformanceForm, ScheduleForm } from "../content-forms";

export const metadata: Metadata = { title: "콘텐츠" };

interface ContentBody {
  carousel_title?: string | null;
  slides?: string[];
  caption?: string | null;
  cta?: string | null;
  hashtags?: string[];
  image_prompt?: string | null;
  reels_hook?: string | null;
  reels_script?: string | null;
  outline?: string[];
}

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, companyId } = await requireCompany();
  const { data: c } = await supabase.from("content_ideas").select("*, trends(id, name)").eq("id", id).eq("company_id", companyId).maybeSingle();
  if (!c) notFound();
  const { data: posts } = await supabase.from("content_posts").select("*").eq("content_idea_id", id).eq("company_id", companyId).order("recorded_at", { ascending: false });
  const body = (c.body ?? {}) as ContentBody;
  const trend = c.trends as { id: string; name: string } | null;

  const scores = [
    ["Trend", c.score_trend],
    ["Originality", c.score_originality],
    ["Audience Fit", c.score_audience_fit],
    ["Save Potential", c.score_save],
    ["Share Potential", c.score_share],
    ["Brand Fit", c.score_brand_fit],
  ] as const;

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border bg-card p-5">
        <Link href="/content" className="text-xs text-muted-foreground hover:text-foreground">
          ← Content Factory
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex gap-1.5">
              <Badge variant="outline">{PLATFORM_LABELS[c.platform as Platform]}</Badge>
              {c.content_type ? <Badge variant="secondary">{c.content_type}</Badge> : null}
            </div>
            <h1 className="text-2xl font-bold">{c.title}</h1>
            {c.hook ? <p className="mt-2 text-lg">“{c.hook}”</p> : null}
            <p className="mt-1 text-sm text-muted-foreground">
              {trend ? (
                <Link href={`/trends/${trend.id}`} className="hover:underline">
                  Trend: {trend.name}
                </Link>
              ) : (
                c.trend
              )}
              {c.angle ? ` · Angle: ${c.angle}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusSelect label="상태" value={c.status} options={CONTENT_STATUSES.map((s) => ({ value: s, label: CONTENT_STATUS_LABELS[s] }))} action={setContentStatus.bind(null, c.id)} />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Content Score</p>
              <p className="text-4xl font-bold tabular-nums">{c.total_score}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="grid content-start gap-4 rounded-xl border bg-card p-5 lg:col-span-2">
          {body.carousel_title ? (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground">Carousel Title</h2>
              <p className="mt-1 font-medium">{body.carousel_title}</p>
            </div>
          ) : null}
          {body.slides?.length ? (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground">Slides</h2>
              <ol className="mt-2 grid gap-2 sm:grid-cols-5">
                {body.slides.map((s, i) => (
                  <li key={i} className="flex aspect-[4/5] flex-col justify-between rounded-lg border bg-muted/40 p-2 text-xs">
                    <span className="font-semibold text-muted-foreground">Slide {i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {body.outline?.length ? (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground">Outline</h2>
              <ol className="mt-1 list-decimal pl-5 text-sm">
                {body.outline.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ol>
            </div>
          ) : null}
          {body.caption ? (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground">Caption</h2>
              <p className="mt-1 text-sm whitespace-pre-line">{body.caption}</p>
            </div>
          ) : null}
          {body.cta ? (
            <p className="text-sm">
              <b>CTA</b> {body.cta}
            </p>
          ) : null}
          {body.hashtags?.length ? <p className="text-sm text-primary">{body.hashtags.join(" ")}</p> : null}
          {body.reels_hook || body.reels_script ? (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground">Reels</h2>
              {body.reels_hook ? <p className="mt-1 text-sm font-medium">Hook: {body.reels_hook}</p> : null}
              {body.reels_script ? <p className="mt-1 text-sm whitespace-pre-line">{body.reels_script}</p> : null}
            </div>
          ) : null}
          {body.image_prompt ? (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground">Image Prompt</h2>
              <p className="mt-1 rounded-md bg-muted/50 p-2 font-mono text-xs">{body.image_prompt}</p>
            </div>
          ) : null}
        </section>
        <section className="grid content-start gap-2 rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">콘텐츠 평가 (각 20점)</h2>
          {scores.map(([label, v]) => (
            <div key={label} className="grid gap-1">
              <div className="flex justify-between text-xs">
                <span>{label}</span>
                <span className="tabular-nums">{v}/20</span>
              </div>
              <ScoreBar value={v} max={20} />
            </div>
          ))}
          <div className="mt-3 border-t pt-3">
            <ScheduleForm contentId={c.id} current={c.scheduled_for} />
          </div>
        </section>
      </div>

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">성과 기록</h2>
        <PerformanceForm contentId={c.id} />
        {posts?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3 font-medium">기록일</th>
                  <th className="py-1 pr-3 font-medium">Views</th>
                  <th className="py-1 pr-3 font-medium">Likes</th>
                  <th className="py-1 pr-3 font-medium">Comments</th>
                  <th className="py-1 pr-3 font-medium">Saves</th>
                  <th className="py-1 pr-3 font-medium">Shares</th>
                  <th className="py-1 pr-3 font-medium">Followers</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {posts.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-1.5 pr-3">{formatDate(p.recorded_at)}</td>
                    <td className="py-1.5 pr-3">{p.views.toLocaleString()}</td>
                    <td className="py-1.5 pr-3">{p.likes.toLocaleString()}</td>
                    <td className="py-1.5 pr-3">{p.comments.toLocaleString()}</td>
                    <td className="py-1.5 pr-3">{p.saves.toLocaleString()}</td>
                    <td className="py-1.5 pr-3">{p.shares.toLocaleString()}</td>
                    <td className="py-1.5 pr-3">{p.followers_gained.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
