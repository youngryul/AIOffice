import type { CreateDatabaseParameters } from "@notionhq/client";

/**
 * AI OFFICE 워크스페이스에 자동 생성되는 Notion Database 정의.
 * Notion API 2025-09-03: Database 생성 시 initial_data_source.properties 로 스키마를 정의한다.
 */
export const NOTION_DB_KEYS = [
  "daily_brief",
  "ai_trends",
  "vibe_coding",
  "opportunities",
  "content_ideas",
  "meetings",
  "ceo_decisions",
  "projects",
] as const;
export type NotionDbKey = (typeof NOTION_DB_KEYS)[number];

type Props = NonNullable<NonNullable<CreateDatabaseParameters["initial_data_source"]>["properties"]>;

const title = { title: {} };
const text = { rich_text: {} };
const date = { date: {} };
const number = { number: { format: "number" as const } };
const select = { select: { options: [] } };
const url = { url: {} };

const trendProps: Props = {
  Title: title,
  Date: date,
  Category: select,
  Summary: text,
  Importance: number,
  "Trend Score": number,
  "Business Score": number,
  "Content Score": number,
  Source: text,
  URL: url,
  Status: select,
};

export const NOTION_DATABASES: Record<NotionDbKey, { title: string; icon: string; properties: Props }> = {
  daily_brief: {
    title: "Daily Brief",
    icon: "📰",
    properties: {
      Title: title,
      Date: date,
      "AI Trend": text,
      "Vibe Coding": text,
      "Business Opportunity": text,
      "Content Idea": text,
      "Important Decisions": text,
    },
  },
  ai_trends: { title: "AI Trends", icon: "🔭", properties: trendProps },
  vibe_coding: { title: "Vibe Coding", icon: "👩‍💻", properties: trendProps },
  opportunities: {
    title: "Business Opportunities",
    icon: "💼",
    properties: {
      Idea: title,
      Problem: text,
      Solution: text,
      Target: text,
      Market: text,
      "Business Model": text,
      Difficulty: select,
      "Opportunity Score": number,
      Status: select,
      Date: date,
    },
  },
  content_ideas: {
    title: "Content Ideas",
    icon: "✍️",
    properties: {
      Title: title,
      Platform: select,
      Hook: text,
      Type: text,
      Trend: text,
      Priority: select,
      Status: select,
      "Publish Date": date,
      Caption: text,
    },
  },
  meetings: {
    title: "Meetings",
    icon: "💬",
    properties: {
      Title: title,
      Date: date,
      Participants: text,
      Topic: text,
      Summary: text,
      Decision: text,
      "Action Items": text,
    },
  },
  ceo_decisions: {
    title: "CEO Decisions",
    icon: "📨",
    properties: {
      Title: title,
      Date: date,
      Type: select,
      Decision: select,
      Reason: text,
      Owner: text,
      Status: select,
    },
  },
  projects: {
    title: "Projects",
    icon: "🚀",
    properties: {
      Name: title,
      Goal: text,
      Status: select,
      Keywords: { multi_select: { options: [] } },
      Created: date,
    },
  },
};
