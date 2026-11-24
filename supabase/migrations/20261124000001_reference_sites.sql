-- ---------------------------------------------------------------------
-- 참고 사이트: CEO 가 운영하는 웹사이트 주소를 저장해 두고 AI 직원이 조사할 때 함께 참고한다.
-- 형식: [{ "url": "https://example.com", "label": "내 블로그" }, ...]  (최대 10개, 앱에서 검증)
-- ---------------------------------------------------------------------
alter table public.aio_companies
  add column if not exists reference_sites jsonb not null default '[]'::jsonb;

-- aio_companies 는 컬럼 단위로 update 권한을 열어 두었으므로 새 컬럼도 명시적으로 허용한다
grant update (reference_sites) on public.aio_companies to authenticated;
