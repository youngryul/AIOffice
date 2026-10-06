import type { Position } from "@/lib/types/domain";
import type { ToolName } from "@/lib/tools/types";

/**
 * 직급 = 이름이 아니라 "권한".
 * 직급이 높을수록 더 좋은 모델, 높은 token budget, 더 많은 Tool, 하위 직원 검토/위임 권한을 가진다.
 */
export type Permission =
  | "collect" // 자료 수집
  | "draft" // 초안 작성
  | "compare" // 데이터 비교
  | "evaluate" // 평가
  | "review" // 팀원 업무 검토
  | "reject" // 업무 반려
  | "synthesize" // 여러 팀 결과 종합
  | "strategy" // 전략 제안
  | "ceo_report" // CEO 보고안 생성
  | "request_approval" // 결재 요청
  | "delegate"; // 업무 위임

export type ModelTier = "junior" | "senior" | "executive";

export interface PositionConfig {
  level: number;
  label: string;
  permissions: Permission[];
  modelTier: ModelTier;
  /** 1회 AI 호출의 max_output_tokens */
  tokenBudget: number;
  /** 기본 일일 예산(USD) */
  dailyBudget: number;
  /** 직급이 허용하는 Tool */
  tools: ToolName[];
}

const JUNIOR: Permission[] = ["collect", "draft"];
const SENIOR: Permission[] = [...JUNIOR, "compare", "evaluate"];
const MANAGER: Permission[] = [...SENIOR, "review", "reject"];
const DIRECTOR: Permission[] = [...MANAGER, "synthesize", "strategy"];
const EXECUTIVE: Permission[] = [...DIRECTOR, "ceo_report", "request_approval", "delegate"];

export const POSITION_CONFIG: Record<Position, PositionConfig> = {
  intern: {
    level: 1,
    label: "Intern",
    permissions: JUNIOR,
    modelTier: "junior",
    tokenBudget: 6000,
    dailyBudget: 0.2,
    tools: ["webSearch", "companyContext"],
  },
  associate: {
    level: 2,
    label: "Associate",
    permissions: JUNIOR,
    modelTier: "junior",
    tokenBudget: 10000,
    dailyBudget: 0.5,
    tools: ["webSearch", "companyContext", "memory", "trendSearch", "projectContext"],
  },
  senior: {
    level: 3,
    label: "Senior",
    permissions: SENIOR,
    modelTier: "senior",
    tokenBudget: 14000,
    dailyBudget: 0.8,
    tools: ["webSearch", "companyContext", "memory", "trendSearch", "projectContext", "database"],
  },
  manager: {
    level: 4,
    label: "Manager",
    permissions: MANAGER,
    modelTier: "senior",
    tokenBudget: 16000,
    dailyBudget: 1.2,
    tools: ["webSearch", "companyContext", "memory", "trendSearch", "projectContext", "database"],
  },
  director: {
    level: 5,
    label: "Director",
    permissions: DIRECTOR,
    modelTier: "executive",
    tokenBudget: 20000,
    dailyBudget: 2,
    tools: ["webSearch", "companyContext", "memory", "trendSearch", "projectContext", "database", "notion"],
  },
  executive: {
    level: 6,
    label: "Executive",
    permissions: EXECUTIVE,
    modelTier: "executive",
    tokenBudget: 24000,
    dailyBudget: 3,
    tools: ["webSearch", "companyContext", "memory", "trendSearch", "projectContext", "database", "notion"],
  },
};

export function positionFromLevel(level: number): Position {
  const entry = Object.entries(POSITION_CONFIG).find(([, c]) => c.level === level);
  return (entry?.[0] as Position | undefined) ?? "associate";
}

export function nextPosition(position: Position): Position | null {
  const level = POSITION_CONFIG[position].level;
  return level >= 6 ? null : positionFromLevel(level + 1);
}

export function hasPermission(position: Position, permission: Permission): boolean {
  return POSITION_CONFIG[position].permissions.includes(permission);
}
