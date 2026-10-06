-- =====================================================================
-- AI Office — helper functions
-- =====================================================================

-- 비용 요약 (RLS 가 적용되는 security invoker 함수: 자기 회사 데이터만 집계된다)
create or replace function public.ai_cost_summary(p_tz text default 'Asia/Seoul')
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with base as (
    select u.*, e.name as employee_name, e.department
    from public.ai_usage u
    left join public.employees e on e.id = u.employee_id
    where u.company_id = public.current_company_id()
      and u.created_at >= (date_trunc('month', now() at time zone p_tz) at time zone p_tz) - interval '7 days'
  ),
  bounds as (
    select
      (date_trunc('day',   now() at time zone p_tz) at time zone p_tz) as day_start,
      (date_trunc('week',  now() at time zone p_tz) at time zone p_tz) as week_start,
      (date_trunc('month', now() at time zone p_tz) at time zone p_tz) as month_start
  )
  select jsonb_build_object(
    'today',   coalesce((select sum(estimated_cost) from base, bounds where created_at >= day_start), 0),
    'week',    coalesce((select sum(estimated_cost) from base, bounds where created_at >= week_start), 0),
    'month',   coalesce((select sum(estimated_cost) from base, bounds where created_at >= month_start), 0),
    'calls_today', coalesce((select count(*) from base, bounds where created_at >= day_start), 0),
    'by_employee', coalesce((
      select jsonb_agg(jsonb_build_object('employee_id', employee_id, 'name', employee_name, 'cost', cost) order by cost desc)
      from (select employee_id, max(employee_name) as employee_name, sum(estimated_cost) as cost
            from base, bounds where created_at >= month_start group by employee_id) x
    ), '[]'::jsonb),
    'by_department', coalesce((
      select jsonb_agg(jsonb_build_object('department', coalesce(department, 'system'), 'cost', cost) order by cost desc)
      from (select department, sum(estimated_cost) as cost
            from base, bounds where created_at >= month_start group by department) x
    ), '[]'::jsonb)
  )
$$;
grant execute on function public.ai_cost_summary(text) to authenticated;

-- Notion Sync Worker: 처리할 작업을 원자적으로 가져온다 (동시 실행되는 워커끼리 겹치지 않음).
-- service_role 전용.
create or replace function public.claim_notion_jobs(p_limit int default 20, p_company_id uuid default null)
returns setof public.notion_sync_queue
language plpgsql security definer set search_path = '' as $$
begin
  -- 오래 PROCESSING 상태로 멈춘 작업 복구 (워커 crash 대비)
  update public.notion_sync_queue
     set status = 'PENDING'
   where status = 'PROCESSING' and next_attempt_at < now() - interval '10 minutes';

  return query
  update public.notion_sync_queue q
     set status = 'PROCESSING', next_attempt_at = now()
   where q.id in (
     select id from public.notion_sync_queue
      where status = 'PENDING' and next_attempt_at <= now()
        and (p_company_id is null or company_id = p_company_id)
      order by created_at
      limit p_limit
      for update skip locked)
  returning q.*;
end $$;
revoke all on function public.claim_notion_jobs(int, uuid) from public, anon, authenticated;
grant execute on function public.claim_notion_jobs(int, uuid) to service_role;

-- 직원 오늘 사용 비용 (예산 체크용, service_role 전용)
create or replace function public.employee_spend_since(p_employee_id uuid, p_since timestamptz)
returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(estimated_cost), 0) from public.ai_usage
   where employee_id = p_employee_id and created_at >= p_since
$$;
revoke all on function public.employee_spend_since(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.employee_spend_since(uuid, timestamptz) to service_role;

create or replace function public.company_spend_since(p_company_id uuid, p_since timestamptz)
returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(estimated_cost), 0) from public.ai_usage
   where company_id = p_company_id and created_at >= p_since
$$;
revoke all on function public.company_spend_since(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.company_spend_since(uuid, timestamptz) to service_role;
