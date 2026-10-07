-- =====================================================================
-- Supabase Cron (pg_cron + pg_net) 으로 AI Office Cron 엔드포인트 호출
--
-- REAL MODE(실제 업무시간 실행)와 Notion Sync Queue 처리를 위해 5분마다 /api/cron/tick 을 호출한다.
-- Vercel Hobby 플랜은 Cron 을 하루 1번만 허용하므로, 주기 실행은 Supabase Cron 사용을 권장한다.
--
-- 실행 방법: Supabase Dashboard → SQL Editor 에 붙여넣고
--            <YOUR_APP_URL>, <YOUR_CRON_SECRET> 를 실제 값으로 바꾼 뒤 실행.
-- (마이그레이션이 아니라 배포 환경마다 한 번 실행하는 설정 스크립트입니다)
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 비밀값은 Vault 에 저장 (SQL 에 평문으로 남기지 않기 위해)
select vault.create_secret('<YOUR_APP_URL>', 'ai_office_app_url', 'AI Office 배포 URL (예: https://ai-office.vercel.app)');
select vault.create_secret('<YOUR_CRON_SECRET>', 'ai_office_cron_secret', 'AI Office CRON_SECRET');

-- 기존 작업이 있으면 교체
select cron.unschedule(jobid) from cron.job where jobname = 'ai-office-tick';

select cron.schedule(
  'ai-office-tick',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'ai_office_app_url') || '/api/cron/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'ai_office_cron_secret')
    ),
    timeout_milliseconds := 300000
  );
  $$
);

-- 확인
-- select * from cron.job;
-- select * from cron.job_run_details order by start_time desc limit 10;
-- select * from net._http_response order by created desc limit 10;
