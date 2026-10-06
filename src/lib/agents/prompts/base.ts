import { POSITION_CONFIG } from "@/lib/agents/positions";
import { ROLE_CATALOG } from "@/lib/agents/roles";
import type { Position, RoleKey } from "@/lib/types/domain";
import { ROLE_PROMPTS } from "./roles";
import { SAFETY_RULES } from "./safety";

export interface PromptEmployee {
  name: string;
  role: RoleKey;
  position: Position;
  personality: string | null;
  specialty: string[];
  interests: string[];
  system_prompt: string | null;
}

/**
 * System Instructions = 공통 규칙 + Role Prompt + 직급/권한 + 성격 + CEO 가 설정한 추가 지시.
 */
export function buildInstructions(employee: PromptEmployee, today: string): string {
  const role = ROLE_CATALOG[employee.role];
  const position = POSITION_CONFIG[employee.position];
  return [
    `너는 "AI Office" 라는 회사에서 일하는 AI 직원 ${employee.name} 이다. 오늘 날짜는 ${today} 이다.`,
    "이 회사는 실제 회사처럼 조사 → 분석 → 검토 → 회의 → 보고 → CEO 결재 프로세스로 일한다.",
    "모든 답변은 한국어로 작성한다 (고유명사·제품명은 원문 표기).",
    SAFETY_RULES,
    `[역할] ${role.title}\n${ROLE_PROMPTS[employee.role].trim()}`,
    `[직급] ${position.label} (Level ${position.level}) — 권한: ${position.permissions.join(", ")}`,
    employee.specialty.length ? `[전문 분야] ${employee.specialty.join(", ")}` : null,
    employee.interests.length ? `[CEO 가 지정한 관심 분야] ${employee.interests.join(", ")}` : null,
    employee.personality ? `[업무 성향] ${employee.personality} (단, 캐릭터성보다 업무 정확성이 우선이다)` : null,
    employee.system_prompt ? `[CEO 추가 지시]\n${employee.system_prompt}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export interface ContextSections {
  company?: string;
  ceoPreferences?: string;
  memory?: string;
  projects?: string;
  trends?: string;
  records?: string;
  previousOutput?: string;
}

const SECTION_TITLES: Record<keyof ContextSections, string> = {
  company: "Company",
  ceoPreferences: "CEO Preferences",
  memory: "Relevant Memory",
  projects: "Relevant Projects",
  trends: "Recent Trends",
  records: "Company Records",
  previousOutput: "Previous Employee Output",
};

/** Input = Context 블록 + Task Prompt */
export function buildInput(context: ContextSections, taskPrompt: string): string {
  const blocks = (Object.keys(SECTION_TITLES) as (keyof ContextSections)[])
    .filter((k) => context[k])
    .map((k) => `## ${SECTION_TITLES[k]}\n${context[k]}`);
  return [...blocks, `## Current Task\n${taskPrompt.trim()}`].join("\n\n");
}
