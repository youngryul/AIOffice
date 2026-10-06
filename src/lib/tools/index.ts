import { POSITION_CONFIG } from "@/lib/agents/positions";
import { ROLE_CATALOG } from "@/lib/agents/roles";
import type { Position, RoleKey } from "@/lib/types/domain";
import type { ToolName } from "./types";

/**
 * 직원이 실제로 사용할 수 있는 Tool = 역할이 필요로 하는 Tool ∩ 직급이 허용하는 Tool.
 * 모든 Agent 가 모든 Tool 을 가지지 않는다.
 */
export function resolveTools(role: RoleKey, position: Position): ToolName[] {
  const allowed = new Set(POSITION_CONFIG[position].tools);
  return ROLE_CATALOG[role].tools.filter((t) => allowed.has(t));
}

export function canUse(tools: ToolName[], tool: ToolName): boolean {
  return tools.includes(tool);
}
