import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";

/**
 * 회사 초기화 — 현재 회사와 그 하위 데이터를 모두 삭제한다 (되돌릴 수 없음).
 *
 * 모든 업무 테이블이 `company_id → aio_companies(id) on delete cascade` 이므로
 * aio_companies 행 하나를 지우면 직원 · 업무 · 트렌드 · 회의 · 결재 · 회사 기억 · Notion 연결 정보까지 함께 사라진다.
 * 로그인 계정(auth.users)과 프로필은 유지되고, profile.company_id 만 비워서 다음 로그인 때 온보딩으로 보낸다.
 *
 * 안전장치: owner_id 가 요청한 사용자일 때만 삭제한다 (companyId 는 반드시 서버 세션에서 얻은 값을 넘길 것).
 */
export async function resetCompany(db: AdminSupabase, params: { userId: string; companyId: string }) {
  const { userId, companyId } = params;

  const { data: deleted, error } = await db
    .from("aio_companies")
    .delete()
    .eq("id", companyId)
    .eq("owner_id", userId)
    .select("id");
  if (error) throw new Error(`회사 초기화 실패: ${error.message}`);
  if (!deleted?.length) throw new Error("초기화할 회사를 찾을 수 없거나 삭제 권한이 없습니다.");

  // on delete set null 로 이미 비워지지만, 명시적으로 한 번 더 보장한다
  const { error: pErr } = await db.from("aio_profiles").update({ company_id: null }).eq("id", userId);
  if (pErr) throw new Error(`프로필 갱신 실패: ${pErr.message}`);
}
