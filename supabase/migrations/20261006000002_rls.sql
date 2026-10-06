-- =====================================================================
-- AI Office — Row Level Security
-- auth.uid() → profiles.company_id → 모든 업무 테이블의 company_id
-- 프론트엔드에서 company_id 를 바꿔도 다른 회사 데이터는 절대 보이지 않는다.
-- =====================================================================

-- 현재 로그인 사용자의 회사 ID. security definer 로 profiles RLS 재귀를 피한다.
create or replace function public.current_company_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select company_id from public.profiles where id = auth.uid()
$$;
revoke all on function public.current_company_id() from public, anon;
grant execute on function public.current_company_id() to authenticated, service_role;

-- 익명 사용자는 어떤 테이블에도 접근할 수 없다.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- ---------------------------------------------------------------------
-- profiles: 본인 행만 조회, display_name 만 수정 가능 (company_id 변경 불가)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- companies: 자기 회사만 조회/수정. 생성은 서버(온보딩)에서만.
-- ---------------------------------------------------------------------
alter table public.companies enable row level security;
create policy companies_select_own on public.companies for select to authenticated using (id = public.current_company_id());
create policy companies_update_own on public.companies for update to authenticated
  using (id = public.current_company_id()) with check (id = public.current_company_id());
revoke insert, delete on public.companies from authenticated;
revoke update on public.companies from authenticated;
grant update (name, mission, goals, brand_direction, interests, brand_topics, research_keywords) on public.companies to authenticated;

-- ---------------------------------------------------------------------
-- company_id 를 가진 일반 업무 테이블: 자기 회사 행만 CRUD
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'company_settings', 'employees', 'projects', 'project_members', 'tasks', 'task_results', 'sources',
    'trends', 'trend_sources', 'trend_snapshots', 'opportunities', 'content_ideas', 'content_posts',
    'meetings', 'meeting_participants', 'meeting_messages', 'meeting_minutes', 'approvals',
    'company_memory', 'employee_performance', 'daily_briefs', 'notion_databases', 'notion_sync_queue', 'notion_pages'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (company_id = public.current_company_id())', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (company_id = public.current_company_id())', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (company_id = public.current_company_id()) with check (company_id = public.current_company_id())', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (company_id = public.current_company_id())', t || '_delete', t);
  end loop;
end $$;

-- company_settings 는 회사당 1행: 삭제 금지
revoke delete on public.company_settings from authenticated;

-- ---------------------------------------------------------------------
-- 서버 전용 쓰기 테이블: 클라이언트는 읽기만
-- ---------------------------------------------------------------------
alter table public.workday_runs enable row level security;
create policy workday_runs_select on public.workday_runs for select to authenticated using (company_id = public.current_company_id());
revoke insert, update, delete on public.workday_runs from authenticated;

alter table public.ai_usage enable row level security;
create policy ai_usage_select on public.ai_usage for select to authenticated using (company_id = public.current_company_id());
revoke insert, update, delete on public.ai_usage from authenticated;

-- ---------------------------------------------------------------------
-- notion_connections: 토큰 컬럼은 authenticated 에게 SELECT 권한 자체가 없다.
-- 연결/토큰 저장은 서버(service role)만 수행. 사용자는 연결 해제(delete)만 가능.
-- ---------------------------------------------------------------------
alter table public.notion_connections enable row level security;
create policy notion_connections_select on public.notion_connections for select to authenticated using (company_id = public.current_company_id());
create policy notion_connections_delete on public.notion_connections for delete to authenticated using (company_id = public.current_company_id());
revoke all on public.notion_connections from authenticated;
grant select (id, company_id, auth_type, workspace_id, workspace_name, bot_id, parent_page_id, root_page_id, status, last_error, connected_at, updated_at)
  on public.notion_connections to authenticated;
grant delete on public.notion_connections to authenticated;
