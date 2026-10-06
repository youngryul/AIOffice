import type {
  ApprovalStatus,
  ContentStatus,
  EmployeeStatus,
  MemoryCategory,
  OpportunityStatus,
  Platform,
  TaskStatus,
  TrendCategory,
  WorkflowStage,
} from "@/lib/types/domain";

/** UI 표시용 라벨 (클라이언트/서버 공용) */

export const EMPLOYEE_STATUS_META: Record<EmployeeStatus, { emoji: string; label: string; tone: string }> = {
  working: { emoji: "🟢", label: "업무중", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  researching: { emoji: "🔍", label: "조사중", tone: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  writing: { emoji: "✍️", label: "보고서 작성중", tone: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300" },
  meeting: { emoji: "💬", label: "회의중", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  approving: { emoji: "📨", label: "결재중", tone: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" },
  break: { emoji: "☕", label: "휴식", tone: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
  offline: { emoji: "⚪", label: "퇴근", tone: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "대기",
  WORKING: "진행중",
  REVIEW: "검토중",
  MEETING: "회의",
  APPROVAL: "결재 대기",
  APPROVED: "승인",
  REJECTED: "반려",
  DONE: "완료",
  FAILED: "실패",
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: "결재 대기",
  APPROVED: "승인",
  REJECTED: "반려",
  MORE_RESEARCH: "추가 조사",
  REVISION: "수정 요청",
  ON_HOLD: "보류",
};

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  IDEA: "Idea",
  RESEARCHING: "Researching",
  VALIDATING: "Validating",
  BUILD: "Build",
  LAUNCHED: "Launched",
  ARCHIVED: "Archived",
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  IDEA: "Idea",
  WRITING: "Writing",
  DESIGN: "Design",
  CEO_REVIEW: "CEO Review",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  threads: "Threads",
  blog: "Blog",
  reels: "Reels",
};

export const TREND_CATEGORY_LABELS: Record<TrendCategory, string> = {
  ai_trend: "AI Trend",
  vibe_coding: "Vibe Coding",
  market: "Market",
  other: "Other",
};

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  morning_meeting: "Morning Meeting",
  research: "Research",
  team_review: "Team Review · Fact Check",
  analysis: "Business Analysis",
  content: "Content Factory",
  executive_meeting: "Executive Meeting",
  executive_summary: "CEO Report",
  done: "퇴근",
};

export const MEMORY_LABELS: Record<MemoryCategory, string> = {
  ceo_preferences: "CEO 선호",
  brand_identity: "브랜드 정체성",
  content_strategy: "콘텐츠 전략",
  rejected_ideas: "반려된 아이디어",
  approved_ideas: "승인된 아이디어",
  best_content: "성과 좋은 콘텐츠",
  bad_content: "성과 나쁜 콘텐츠",
  current_projects: "진행 중 프로젝트",
  business_interests: "사업 관심사",
  research_interests: "리서치 관심사",
  past_decisions: "과거 결정",
};
