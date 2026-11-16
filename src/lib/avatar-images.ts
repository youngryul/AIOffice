import type { RoleKey } from "@/lib/types/domain";

/**
 * 직원 아바타 이미지 슬롯.
 *
 * 1) 사용할 이미지를 `public/avatars/` 폴더에 넣는다. (png / webp / gif / svg 모두 가능)
 * 2) 아래에서 역할 키에 파일 경로를 적는다. 예) chief_of_staff: "/avatars/chief_of_staff.png"
 *
 * 경로를 적지 않은 역할은 기본 동물 캐릭터(critter.tsx)로 표시된다.
 * 존재하지 않는 파일을 적으면 이미지가 깨지므로, 파일을 넣은 역할만 적을 것.
 */
export const AVATAR_IMAGES: Partial<Record<RoleKey, string>> = {
  // chief_of_staff: "/avatars/chief_of_staff.png",
  // ai_trend_researcher: "/avatars/ai_trend_researcher.png",
  // vibe_coding_researcher: "/avatars/vibe_coding_researcher.png",
  // market_researcher: "/avatars/market_researcher.png",
  // business_analyst: "/avatars/business_analyst.png",
  // brand_strategist: "/avatars/brand_strategist.png",
  // content_strategist: "/avatars/content_strategist.png",
  // fact_checker: "/avatars/fact_checker.png",
};
