-- =====================================================================
-- AI Office — Row Level Security
-- auth.uid() → profiles.company_id → 모든 업무 테이블의 company_id
-- 프론트엔드에서 company_id 를 바꿔도 다른 회사 데이터는 절대 보이지 않는다.
-- =====================================================================

-- 현재 로그인 사용자의 회사 ID. security definer 로 profiles RLS 재귀를 피한다.
create or replace function public.aio_current_company_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select company_id from public.aio_profiles where id = auth.uid()
$$;
revoke all on function public.aio_current_company_id() from public, anon;
grant execute on function public.aio_current_company_id() to authenticated, service_role;

-- 익명 사용자는 AI Office 의 어떤 테이블에도 접근할 수 없다.
-- 한 DB 를 여러 프로젝트가 같이 쓰므로 schema 전체가 아니라 aio_ 테이블에만 적용한다
-- (schema 단위 revoke / default privileges 는 다른 프로젝트 테이블의 권한까지 바꾼다).
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'aio\_%'
  loop
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- profiles: 본인 행만 조회, display_name 만 수정 가능 (company_id 변경 불가)
-- ---------------------------------------------------------------------
alter table public.aio_profiles enable row level security;
create policy aio_profiles_select_own on public.aio_profiles for select to authenticated using (id = auth.uid());
create policy aio_profiles_update_own on public.aio_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.aio_profiles from authenticated;
grant update (display_name) on public.aio_profiles to authenticated;

-- ---------------------------------------------------------------------
-- companies: 자기 회사만 조회/수정. 생성은 서버(온보딩)에서만.
-- ---------------------------------------------------------------------
alter table public.aio_companies enable row level security;
create policy aio_companies_select_own on public.aio_companies for select to authenticated using (id = public.aio_current_company_id());
create policy aio_companies_update_own on public.aio_companies for update to authenticated
  using (id = public.aio_current_company_id()) with check (id = public.aio_current_company_id());
revoke insert, delete on public.aio_companies from authenticated;
revoke update on public.aio_companies from authenticated;
grant update (name, mission, goals, brand_direction, interests, brand_topics, research_keywords) on public.aio_companies to authenticated;

-- ---------------------------------------------------------------------
-- company_id 를 가진 일반 업무 테이블: 자기 회사 행만 CRUD
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'aio_company_settings', 'aio_employees', 'aio_projects', 'aio_project_members', 'aio_tasks', 'aio_task_results', 'aio_sources',
    'aio_trends', 'aio_trend_sources', 'aio_trend_snapshots', 'aio_opportunities', 'aio_content_ideas', 'aio_content_posts',
    'aio_meetings', 'aio_meeting_participants', 'aio_meeting_messages', 'aio_meeting_minutes', 'aio_approvals',
    'aio_company_memory', 'aio_employee_performance', 'aio_daily_briefs', 'aio_notion_databases', 'aio_notion_sync_queue', 'aio_notion_pages'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (company_id = public.aio_current_company_id())', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (company_id = public.aio_current_company_id())', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (company_id = public.aio_current_company_id()) with check (company_id = public.aio_current_company_id())', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (company_id = public.aio_current_company_id())', t || '_delete', t);
  end loop;
end $$;

-- company_settings 는 회사당 1행: 삭제 금지
revoke delete on public.aio_company_settings from authenticated;

-- ---------------------------------------------------------------------
-- 서버 전용 쓰기 테이블: 클라이언트는 읽기만
-- ---------------------------------------------------------------------
alter table public.aio_workday_runs enable row level security;
create policy aio_workday_runs_select on public.aio_workday_runs for select to authenticated using (company_id = public.aio_current_company_id());
revoke insert, update, delete on public.aio_workday_runs from authenticated;

alter table public.aio_ai_usage enable row level security;
create policy aio_ai_usage_select on public.aio_ai_usage for select to authenticated using (company_id = public.aio_current_company_id());
revoke insert, update, delete on public.aio_ai_usage from authenticated;

-- ---------------------------------------------------------------------
-- notion_connections: 토큰 컬럼은 authenticated 에게 SELECT 권한 자체가 없다.
-- 연결/토큰 저장은 서버(service role)만 수행. 사용자는 연결 해제(delete)만 가능.
-- ---------------------------------------------------------------------
alter table public.aio_notion_connections enable row level security;
create policy aio_notion_connections_select on public.aio_notion_connections for select to authenticated using (company_id = public.aio_current_company_id());
create policy aio_notion_connections_delete on public.aio_notion_connections for delete to authenticated using (company_id = public.aio_current_company_id());
revoke all on public.aio_notion_connections from authenticated;
grant select (id, company_id, auth_type, workspace_id, workspace_name, bot_id, parent_page_id, root_page_id, status, last_error, connected_at, updated_at)
  on public.aio_notion_connections to authenticated;
grant delete on public.aio_notion_connections to authenticated;
