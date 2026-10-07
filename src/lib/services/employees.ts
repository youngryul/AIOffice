import "server-only";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { POSITION_CONFIG } from "@/lib/agents/positions";
import { ROLE_CATALOG } from "@/lib/agents/roles";
import type { Position, RoleKey } from "@/lib/types/domain";

/** 역할 카탈로그 + 직급 설정으로 신규 직원 행을 만든다 */
export function buildEmployeeRow(params: {
  companyId: string;
  userId: string;
  role: RoleKey;
  name?: string;
  position?: Position;
  interests?: string[];
}): TablesInsert<"employees"> {
  const role = ROLE_CATALOG[params.role];
  const position = params.position ?? role.defaultPosition;
  const config = POSITION_CONFIG[position];
  return {
    company_id: params.companyId,
    user_id: params.userId,
    name: params.name?.trim() || role.defaultName,
    avatar: role.avatar,
    department: role.department,
    position,
    level: config.level,
    role: role.key,
    specialty: role.specialty,
    interests: params.interests ?? [],
    personality: role.personality,
    status: "offline",
    model: null,
    token_budget: config.tokenBudget,
    daily_budget: config.dailyBudget,
  };
}
