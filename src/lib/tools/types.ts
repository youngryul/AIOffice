export const TOOL_NAMES = [
  "webSearch",
  "database",
  "memory",
  "trendSearch",
  "companyContext",
  "projectContext",
  "notion",
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export const TOOL_LABELS: Record<ToolName, string> = {
  webSearch: "웹 검색",
  database: "사내 DB 조회",
  memory: "회사 기억",
  trendSearch: "트렌드 검색",
  companyContext: "회사 컨텍스트",
  projectContext: "프로젝트 컨텍스트",
  notion: "Notion 기록",
};
