/**
 * 공통 도메인 타입. DB enum(check constraint) 과 1:1 로 맞춘다.
 * 서버/클라이언트 양쪽에서 import 가능 (비밀 값 없음).
 */

export const POSITIONS = ["intern", "associate", "senior", "manager", "director", "executive"] as const;
export type Position = (typeof POSITIONS)[number];

export const DEPARTMENTS = ["executive", "research", "strategy", "content", "quality"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const ROLES = [
  "chief_of_staff",
  "ai_trend_researcher",
  "vibe_coding_researcher",
  "market_researcher",
  "business_analyst",
  "brand_strategist",
  "content_strategist",
  "fact_checker",
] as const;
export type RoleKey = (typeof ROLES)[number];

export const EMPLOYEE_STATUSES = ["working", "researching", "writing", "meeting", "approving", "break", "offline"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const TASK_STATUSES = ["TODO", "WORKING", "REVIEW", "MEETING", "APPROVAL", "APPROVED", "REJECTED", "DONE", "FAILED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "MORE_RESEARCH", "REVISION", "ON_HOLD"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_TYPES = ["research", "opportunity", "content", "strategy", "project", "promotion", "budget", "other"] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export const OPPORTUNITY_STATUSES = ["IDEA", "RESEARCHING", "VALIDATING", "BUILD", "LAUNCHED", "ARCHIVED"] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const CONTENT_STATUSES = ["IDEA", "WRITING", "DESIGN", "CEO_REVIEW", "SCHEDULED", "PUBLISHED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const PLATFORMS = ["instagram", "threads", "blog", "reels"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const TREND_CATEGORIES = ["ai_trend", "vibe_coding", "market", "other"] as const;
export type TrendCategory = (typeof TREND_CATEGORIES)[number];

export const MEMORY_CATEGORIES = [
  "ceo_preferences",
  "brand_identity",
  "content_strategy",
  "rejected_ideas",
  "approved_ideas",
  "best_content",
  "bad_content",
  "current_projects",
  "business_interests",
  "research_interests",
  "past_decisions",
] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const WORKFLOW_STAGES = [
  "morning_meeting",
  "research",
  "team_review",
  "analysis",
  "content",
  "executive_meeting",
  "executive_summary",
  "done",
] as const;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

export const WORK_MODES = ["REAL", "FAST"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

/** CEO 피드백 태그 (승인/반려 시 선택) */
export const FEEDBACK_TAGS = [
  "좋음",
  "너무 흔함",
  "과장됨",
  "우리 브랜드와 안 맞음",
  "이미 알고 있음",
  "콘텐츠로 좋음",
  "사업 아이디어로 좋음",
] as const;

export interface WorkSchedule {
  start: string;
  morning_meeting: string;
  research: string;
  team_review: string;
  content: string;
  manager_review: string;
  executive_meeting: string;
  ceo_report: string;
  end: string;
}

export const DEFAULT_SCHEDULE: WorkSchedule = {
  start: "09:00",
  morning_meeting: "09:10",
  research: "09:30",
  team_review: "11:00",
  content: "13:00",
  manager_review: "15:00",
  executive_meeting: "16:00",
  ceo_report: "16:30",
  end: "17:00",
};

/** Daily Brief 의 각 항목 (DB jsonb 에 저장되는 형태) */
export interface BriefItem {
  id: string | null;
  title: string;
  summary: string;
  score: number;
  url?: string | null;
}

export interface ThingToTry {
  title: string;
  why: string;
  how: string;
  trend_id: string | null;
}

export interface CompetitorMovement {
  name: string;
  movement: string;
  implication: string;
}
