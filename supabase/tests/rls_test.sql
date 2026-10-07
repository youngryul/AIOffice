-- =====================================================================
-- RLS 격리 테스트 (로컬 전용). 실행:
--   docker exec -i supabase_db_ai-office psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/rls_test.sql
-- 모든 변경은 ROLLBACK 되므로 데이터가 남지 않는다.
-- =====================================================================
begin;

-- 두 명의 CEO, 두 개의 회사
insert into auth.users (id, email, instance_id, aud, role)
values ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

do $$ begin
  assert (select count(*) from public.profiles where id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b')) = 2,
    'profiles trigger did not create profiles';
end $$;

insert into public.companies (id, owner_id, name) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Company A'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Company B');
update public.profiles set company_id = '10000000-0000-0000-0000-00000000000a' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set company_id = '10000000-0000-0000-0000-00000000000b' where id = '00000000-0000-0000-0000-00000000000b';
insert into public.company_settings (company_id) values ('10000000-0000-0000-0000-00000000000a'), ('10000000-0000-0000-0000-00000000000b');
insert into public.trends (company_id, slug, name) values
  ('10000000-0000-0000-0000-00000000000a', 'a-trend', 'A trend'),
  ('10000000-0000-0000-0000-00000000000b', 'b-trend', 'B trend');
insert into public.ai_usage (company_id, agent, model, estimated_cost) values
  ('10000000-0000-0000-0000-00000000000a', 'x', 'gpt-5-mini', 0.5),
  ('10000000-0000-0000-0000-00000000000b', 'x', 'gpt-5-mini', 9.0);
insert into public.notion_connections (company_id, auth_type, access_token_enc) values
  ('10000000-0000-0000-0000-00000000000b', 'token', 'v1:secret');

-- ---- CEO A 로 전환 ----
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$ begin
  assert public.current_company_id() = '10000000-0000-0000-0000-00000000000a', 'current_company_id wrong';
  assert (select count(*) from public.companies) = 1, 'A can see other companies';
  assert (select count(*) from public.trends) = 1, 'A can see B trends';
  assert (select count(*) from public.trends where company_id = '10000000-0000-0000-0000-00000000000b') = 0, 'company_id filter bypass';
  assert (select count(*) from public.profiles) = 1, 'A can see other profiles';
  assert (select count(*) from public.notion_connections) = 0, 'A can see B notion connection';
  assert ((public.ai_cost_summary('Asia/Seoul') ->> 'month')::numeric) = 0.5, 'cost summary leaks other company cost';
end $$;

-- 다른 회사로 행을 넣거나 옮길 수 없다
do $$ begin
  begin
    insert into public.trends (company_id, slug, name) values ('10000000-0000-0000-0000-00000000000b', 'evil', 'evil');
    raise exception 'FAIL: insert into other company succeeded';
  exception when insufficient_privilege then null; end;
end $$;

update public.trends set company_id = '10000000-0000-0000-0000-00000000000b' where slug = 'b-trend';
do $$ begin
  -- B 의 행은 보이지 않으므로 업데이트 0건
  assert (select count(*) from public.trends where name = 'B trend') = 0, 'A updated B row';
end $$;

do $$ begin
  begin
    update public.trends set company_id = '10000000-0000-0000-0000-00000000000b' where slug = 'a-trend';
    raise exception 'FAIL: moved own row to other company';
  exception when insufficient_privilege then null; end;
end $$;

-- profile 의 company_id 는 사용자가 바꿀 수 없다
do $$ begin
  begin
    update public.profiles set company_id = '10000000-0000-0000-0000-00000000000b' where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: user changed profiles.company_id';
  exception when insufficient_privilege then null; end;
end $$;

-- 서버 전용 테이블 쓰기 금지
do $$ begin
  begin
    insert into public.ai_usage (company_id, agent, model) values ('10000000-0000-0000-0000-00000000000a', 'x', 'y');
    raise exception 'FAIL: user inserted ai_usage';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.workday_runs (company_id, run_date, mode) values ('10000000-0000-0000-0000-00000000000a', current_date, 'FAST');
    raise exception 'FAIL: user inserted workday_runs';
  exception when insufficient_privilege then null; end;
end $$;

-- service_role 전용 함수 호출 금지
do $$ begin
  begin
    perform public.claim_notion_jobs(10, null);
    raise exception 'FAIL: user called claim_notion_jobs';
  exception when insufficient_privilege then null; end;
end $$;

-- ---- CEO B: Notion 토큰 컬럼은 자기 회사 것이어도 읽을 수 없다 ----
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from public.notion_connections) = 1, 'B cannot see own connection';
  begin
    perform access_token_enc from public.notion_connections;
    raise exception 'FAIL: token column readable';
  exception when insufficient_privilege then null; end;
end $$;

-- ---- 익명 사용자는 아무것도 볼 수 없다 ----
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.trends;
    raise exception 'FAIL: anon can read trends';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select 'RLS TESTS PASSED' as result;
rollback;
