import "server-only";
import type { BlockObjectRequest, CreatePageParameters } from "@notionhq/client";
import type { AdminSupabase } from "@/lib/supabase/admin";
import type { NotionEntityType } from "@/lib/tools/notion";
import type { BriefItem, CompetitorMovement, ThingToTry } from "@/lib/types/domain";
import type { NotionDbKey } from "./schema";

type Properties = NonNullable<CreatePageParameters["properties"]>;

export interface NotionPagePayload {
  dbKey: NotionDbKey;
  properties: Properties;
  children: BlockObjectRequest[];
}

// ---- property helpers (Notion rich_text 는 2000자 제한) ----
const clip = (s: string | null | undefined, n = 1900) => (s ?? "").slice(0, n);
const titleProp = (s: string) => ({ title: [{ type: "text" as const, text: { content: clip(s, 200) || "(untitled)" } }] });
const textProp = (s: string | null | undefined) => ({ rich_text: s ? [{ type: "text" as const, text: { content: clip(s) } }] : [] });
const numberProp = (n: number | null | undefined) => ({ number: n ?? null });
const selectProp = (s: string | null | undefined) => ({ select: s ? { name: clip(s, 90).replace(/,/g, " ") } : null });
const dateProp = (d: string | null | undefined) => ({ date: d ? { start: d.slice(0, 10) } : null });
const urlProp = (u: string | null | undefined) => ({ url: u ?? null });

const heading = (s: string): BlockObjectRequest => ({
  object: "block",
  type: "heading_2",
  heading_2: { rich_text: [{ type: "text", text: { content: clip(s, 200) } }] },
});
const paragraph = (s: string): BlockObjectRequest => ({
  object: "block",
  type: "paragraph",
  paragraph: { rich_text: [{ type: "text", text: { content: clip(s) } }] },
});
const bullet = (s: string): BlockObjectRequest => ({
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: { rich_text: [{ type: "text", text: { content: clip(s) } }] },
});

const asList = (items: BriefItem[]) => items.map((i, n) => `${n + 1}. ${i.title} (${i.score})`).join("\n");

/** DB 엔티티 → Notion 페이지. 엔티티가 없으면 null */
export async function buildNotionPage(db: AdminSupabase, companyId: string, type: NotionEntityType, id: string): Promise<NotionPagePayload | null> {
  switch (type) {
    case "daily_brief": {
      const { data: b } = await db.from("daily_briefs").select("*").eq("id", id).eq("company_id", companyId).maybeSingle();
      if (!b) return null;
      const ai = b.ai_trends as unknown as BriefItem[];
      const vibe = b.vibe_coding as unknown as BriefItem[];
      const opps = b.opportunities as unknown as BriefItem[];
      const contents = b.content_ideas as unknown as BriefItem[];
      const tries = b.things_to_try as unknown as ThingToTry[];
      const comps = b.competitor_movement as unknown as CompetitorMovement[];
      const decisions = b.important_decisions as unknown as string[];
      return {
        dbKey: "daily_brief",
        properties: {
          Title: titleProp(b.title),
          Date: dateProp(b.brief_date),
          "AI Trend": textProp(asList(ai)),
          "Vibe Coding": textProp(asList(vibe)),
          "Business Opportunity": textProp(asList(opps)),
          "Content Idea": textProp(asList(contents)),
          "Important Decisions": textProp(decisions.join("\n")),
        },
        children: [
          heading("Executive Summary"),
          paragraph(b.executive_summary ?? ""),
          heading("AI Trend TOP 5"),
          ...ai.map((i) => bullet(`${i.title} (${i.score}) — ${i.summary}`)),
          heading("Vibe Coding TOP 3"),
          ...vibe.map((i) => bullet(`${i.title} (${i.score}) — ${i.summary}`)),
          heading("Business Opportunity TOP 3"),
          ...opps.map((i) => bullet(`${i.title} (${i.score}) — ${i.summary}`)),
          heading("Content Idea TOP 5"),
          ...contents.map((i) => bullet(`${i.title} (${i.score}) — ${i.summary}`)),
          heading("Things To Try"),
          ...tries.map((t) => bullet(`${t.title}: ${t.why} → ${t.how}`)),
          heading("Competitor Movement"),
          ...comps.map((c) => bullet(`${c.name}: ${c.movement} (${c.implication})`)),
        ],
      };
    }
    case "trend": {
      const { data: t } = await db.from("trends").select("*").eq("id", id).eq("company_id", companyId).maybeSingle();
      if (!t) return null;
      const { data: links } = await db.from("trend_sources").select("sources(title, url, publisher)").eq("trend_id", id).limit(10);
      const sources = (links ?? []).map((l) => l.sources as { title: string; url: string; publisher: string | null } | null).filter((s) => s !== null);
      return {
        dbKey: t.category === "vibe_coding" ? "vibe_coding" : "ai_trends",
        properties: {
          Title: titleProp(t.name),
          Date: dateProp(t.last_seen_at),
          Category: selectProp(t.category),
          Summary: textProp(t.summary),
          Importance: numberProp(t.importance),
          "Trend Score": numberProp(t.current_score),
          "Business Score": numberProp(t.business_score),
          "Content Score": numberProp(t.content_score),
          Source: textProp(sources.map((s) => s.publisher ?? s.title).join(", ")),
          URL: urlProp(sources[0]?.url),
          Status: selectProp(t.fact_check_status === "verified" ? "Verified" : t.status),
        },
        children: [
          paragraph(t.summary ?? ""),
          ...(t.try_worthy ? [heading("직접 써볼 가치"), paragraph(t.try_reason ?? "")] : []),
          heading("Sources"),
          ...sources.map((s) => bullet(`${s.title} — ${s.url}`)),
        ],
      };
    }
    case "opportunity": {
      const { data: o } = await db.from("opportunities").select("*").eq("id", id).eq("company_id", companyId).maybeSingle();
      if (!o) return null;
      return {
        dbKey: "opportunities",
        properties: {
          Idea: titleProp(o.title),
          Problem: textProp(o.problem),
          Solution: textProp(o.solution),
          Target: textProp(o.target_user),
          Market: textProp(o.market),
          "Business Model": textProp(o.business_model),
          Difficulty: selectProp(o.difficulty),
          "Opportunity Score": numberProp(o.opportunity_score),
          Status: selectProp(o.status),
          Date: dateProp(o.created_at),
        },
        children: [
          heading("Product Idea"),
          paragraph(o.product_idea ?? ""),
          heading("Competition"),
          paragraph(o.competition ?? ""),
          paragraph(`예상 개발 기간: ${o.development_time ?? "-"}`),
        ],
      };
    }
    case "content_idea": {
      const { data: c } = await db.from("content_ideas").select("*").eq("id", id).eq("company_id", companyId).maybeSingle();
      if (!c) return null;
      const body = (c.body ?? {}) as { caption?: string | null; slides?: string[]; reels_script?: string | null; outline?: string[]; hashtags?: string[] };
      return {
        dbKey: "content_ideas",
        properties: {
          Title: titleProp(c.title),
          Platform: selectProp(c.platform),
          Hook: textProp(c.hook),
          Type: textProp(c.content_type),
          Trend: textProp(c.trend),
          Priority: selectProp(c.priority),
          Status: selectProp(c.status),
          "Publish Date": dateProp(c.scheduled_for),
          Caption: textProp(body.caption),
        },
        children: [
          paragraph(`Angle: ${c.angle ?? ""} · Score ${c.total_score}`),
          ...(body.slides?.length ? [heading("Slides"), ...body.slides.map((s, i) => bullet(`Slide ${i + 1}: ${s}`))] : []),
          ...(body.outline?.length ? [heading("Outline"), ...body.outline.map(bullet)] : []),
          ...(body.reels_script ? [heading("Reels Script"), paragraph(body.reels_script)] : []),
          ...(body.hashtags?.length ? [paragraph(body.hashtags.join(" "))] : []),
        ],
      };
    }
    case "meeting": {
      const { data: m } = await db.from("meetings").select("*, meeting_minutes(*)").eq("id", id).eq("company_id", companyId).maybeSingle();
      if (!m) return null;
      const minutes = Array.isArray(m.meeting_minutes) ? m.meeting_minutes[0] : m.meeting_minutes;
      const actionItems = ((minutes?.action_items ?? []) as { owner: string; item: string }[]).map((a) => `${a.owner}: ${a.item}`);
      return {
        dbKey: "meetings",
        properties: {
          Title: titleProp(m.topic),
          Date: dateProp(m.started_at),
          Participants: textProp(((minutes?.participants ?? []) as string[]).join(", ")),
          Topic: textProp(m.topic),
          Summary: textProp(minutes?.discussion),
          Decision: textProp(minutes?.decision),
          "Action Items": textProp(actionItems.join("\n")),
        },
        children: [
          heading("Discussion"),
          paragraph(minutes?.discussion ?? ""),
          heading("Consensus"),
          paragraph(minutes?.consensus ?? ""),
          heading("Action Items"),
          ...actionItems.map(bullet),
        ],
      };
    }
    case "approval": {
      const { data: a } = await db.from("approvals").select("*, employees(name)").eq("id", id).eq("company_id", companyId).maybeSingle();
      if (!a) return null;
      const owner = (a.employees as { name: string } | null)?.name ?? "";
      return {
        dbKey: "ceo_decisions",
        properties: {
          Title: titleProp(a.title),
          Date: dateProp(a.decided_at ?? a.created_at),
          Type: selectProp(a.type),
          Decision: selectProp(a.status),
          Reason: textProp([a.feedback_tags.join(", "), a.decision_note].filter(Boolean).join(" — ") || a.reason),
          Owner: textProp(owner),
          Status: selectProp(a.status === "PENDING" ? "Pending" : "Decided"),
        },
        children: [
          heading("Summary"),
          paragraph(a.summary ?? ""),
          heading("Recommendation"),
          paragraph(a.recommendation ?? ""),
          paragraph(`Impact: ${a.impact ?? "-"} · Cost: ${a.cost ?? "-"}`),
        ],
      };
    }
    case "project": {
      const { data: p } = await db.from("projects").select("*").eq("id", id).eq("company_id", companyId).maybeSingle();
      if (!p) return null;
      return {
        dbKey: "projects",
        properties: {
          Name: titleProp(p.name),
          Goal: textProp(p.goal),
          Status: selectProp(p.status),
          Keywords: { multi_select: p.research_keywords.slice(0, 20).map((k) => ({ name: clip(k, 90).replace(/,/g, " ") })) },
          Created: dateProp(p.created_at),
        },
        children: [paragraph(p.description ?? "")],
      };
    }
  }
}
