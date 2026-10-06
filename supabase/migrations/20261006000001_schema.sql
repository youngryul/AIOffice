-- =====================================================================
-- AI Office — core schema
-- 모든 업무 데이터는 company_id 를 가지며, RLS 는 20261006000002_rls.sql 에서 적용한다.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Companies / Profiles
-- ---------------------------------------------------------------------
create table public.companies (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users(id) on delete cascade,
  name                  text not null check (char_length(name) between 1 and 100),
  mission               text,
  goals                 text,
  brand_direction       text,
  interests             text[] not null default '{}',
  brand_topics          text[] not null default '{}',
  research_keywords     text[] not null default '{}',
  is_demo               boolean not null default false,
  onboarding_completed  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index companies_owner_idx on public.companies(owner_id);

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  company_id    uuid references public.companies(id) on delete set null,
  email         text,
  display_name  text,
  role          text not null default 'ceo' check (role in ('ceo')),
  created_at    timestamptz not null default now()
);
create index profiles_company_idx on public.profiles(company_id);

create table public.company_settings (
  company_id          uuid primary key references public.companies(id) on delete cascade,
  timezone            text not null default 'Asia/Seoul',
  work_mode           text not null default 'FAST' check (work_mode in ('REAL', 'FAST')),
  -- {"start":"09:00","morning_meeting":"09:10","research":"09:30","team_review":"11:00",
  --  "content":"13:00","manager_review":"15:00","executive_meeting":"16:00","ceo_report":"16:30","end":"17:00"}
  schedule            jsonb not null default '{}'::jsonb,
  workdays            int[] not null default '{1,2,3,4,5}',
  monthly_budget_usd  numeric(10,2) not null default 30,
  ai_enabled          boolean not null default true,
  notion_auto_sync    boolean not null default true,
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------
create table public.employees (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  avatar               text not null default '🤖',
  department           text not null check (department in ('executive', 'research', 'strategy', 'content', 'quality')),
  position             text not null check (position in ('intern', 'associate', 'senior', 'manager', 'director', 'executive')),
  level                int  not null check (level between 1 and 6),
  role                 text not null check (role in (
                         'chief_of_staff', 'ai_trend_researcher', 'vibe_coding_researcher', 'market_researcher',
                         'business_analyst', 'brand_strategist', 'content_strategist', 'fact_checker')),
  system_prompt        text,
  specialty            text[] not null default '{}',
  interests            text[] not null default '{}',
  personality          text,
  status               text not null default 'offline' check (status in (
                         'working', 'researching', 'writing', 'meeting', 'approving', 'break', 'offline')),
  model                text,
  token_budget         int  not null default 8000 check (token_budget > 0),
  daily_budget         numeric(10,4) not null default 0.50 check (daily_budget >= 0),
  accuracy_score       numeric(5,2) not null default 0,
  performance_score    numeric(5,2) not null default 0,
  approval_rate        numeric(5,2) not null default 0,
  promotion_candidate  boolean not null default false,
  is_active            boolean not null default true,
  current_task_id      uuid,
  hired_at             timestamptz not null default now(),
  fired_at             timestamptz,
  created_at           timestamptz not null default now()
);
create index employees_company_idx on public.employees(company_id, is_active);

-- ---------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------
create table public.projects (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  name               text not null,
  goal               text,
  description        text,
  status             text not null default 'active' check (status in ('active', 'paused', 'done')),
  research_keywords  text[] not null default '{}',
  auto_research      boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index projects_company_idx on public.projects(company_id);

create table public.project_members (
  project_id   uuid not null references public.projects(id) on delete cascade,
  employee_id  uuid not null references public.employees(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  role         text,
  primary key (project_id, employee_id)
);

-- ---------------------------------------------------------------------
-- Workday runs (workflow state machine)
-- ---------------------------------------------------------------------
create table public.workday_runs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  run_date      date not null,
  mode          text not null check (mode in ('REAL', 'FAST')),
  stage         text not null default 'morning_meeting' check (stage in (
                  'morning_meeting', 'research', 'team_review', 'analysis', 'content',
                  'executive_meeting', 'executive_summary', 'done')),
  status        text not null default 'running' check (status in ('running', 'completed', 'failed', 'cancelled')),
  stage_retry   int not null default 0,
  stage_log     jsonb not null default '[]'::jsonb,
  plan          jsonb,
  locked_until  timestamptz,
  error         text,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index workday_runs_company_idx on public.workday_runs(company_id, created_at desc);
create unique index workday_runs_one_running on public.workday_runs(company_id) where status = 'running';

-- ---------------------------------------------------------------------
-- Tasks / Results / Sources
-- ---------------------------------------------------------------------
create table public.tasks (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  run_id               uuid references public.workday_runs(id) on delete set null,
  project_id           uuid references public.projects(id) on delete set null,
  title                text not null,
  description          text,
  department           text,
  task_type            text not null default 'research' check (task_type in ('research', 'review', 'analysis', 'content', 'meeting', 'summary', 'custom')),
  assigned_employee    uuid references public.employees(id) on delete set null,
  priority             text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status               text not null default 'TODO' check (status in (
                         'TODO', 'WORKING', 'REVIEW', 'MEETING', 'APPROVAL', 'APPROVED', 'REJECTED', 'DONE', 'FAILED')),
  keywords             text[] not null default '{}',
  due_at               timestamptz,
  parent_task_id       uuid references public.tasks(id) on delete set null,
  created_by           text not null default 'system' check (created_by in ('ceo', 'chief_of_staff', 'system')),
  source               text not null default 'morning_meeting' check (source in ('morning_meeting', 'ceo', 'project', 'approval_followup', 'system')),
  retry_count          int not null default 0,
  last_error           text,
  started_at           timestamptz,
  completed_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index tasks_company_status_idx on public.tasks(company_id, status, created_at desc);
create index tasks_run_idx on public.tasks(run_id);

alter table public.employees
  add constraint employees_current_task_fk foreign key (current_task_id) references public.tasks(id) on delete set null;

create table public.task_results (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  task_id        uuid not null references public.tasks(id) on delete cascade,
  employee_id    uuid references public.employees(id) on delete set null,
  stage          text not null check (stage in ('research', 'review', 'analysis', 'content', 'summary')),
  output         jsonb not null,
  summary        text,
  confidence     numeric(5,2),
  review_status  text not null default 'pending' check (review_status in ('pending', 'passed', 'rejected', 'needs_revision')),
  reviewer_id    uuid references public.employees(id) on delete set null,
  review_notes   text,
  model          text,
  created_at     timestamptz not null default now()
);
create index task_results_company_idx on public.task_results(company_id, created_at desc);
create index task_results_task_idx on public.task_results(task_id);

create table public.sources (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  task_result_id  uuid references public.task_results(id) on delete set null,
  title           text not null,
  url             text not null check (url ~* '^https?://'),
  normalized_url  text not null,
  publisher       text,
  published_at    timestamptz,
  retrieved_at    timestamptz not null default now(),
  source_type     text not null default 'other' check (source_type in ('news', 'blog', 'official', 'paper', 'community', 'product', 'video', 'other')),
  is_verified     boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (company_id, normalized_url)
);

-- ---------------------------------------------------------------------
-- Trends
-- ---------------------------------------------------------------------
create table public.trends (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  run_id             uuid references public.workday_runs(id) on delete set null,
  slug               text not null,
  name               text not null,
  category           text not null default 'ai_trend' check (category in ('ai_trend', 'vibe_coding', 'market', 'other')),
  summary            text,
  importance         int not null default 0 check (importance between 0 and 100),
  novelty            int not null default 0 check (novelty between 0 and 100),
  growth_score       int not null default 0 check (growth_score between 0 and 100),
  business_score     int not null default 0 check (business_score between 0 and 100),
  content_score      int not null default 0 check (content_score between 0 and 100),
  developer_score    int not null default 0 check (developer_score between 0 and 100),
  current_score      int not null default 0 check (current_score between 0 and 100),
  mention_count      int not null default 1,
  practical_value    int not null default 0 check (practical_value between 0 and 100),
  try_worthy         boolean not null default false,
  try_reason         text,
  status             text not null default 'active' check (status in ('new', 'active', 'watching', 'archived')),
  fact_check_status  text not null default 'unverified' check (fact_check_status in ('verified', 'unverified', 'rejected')),
  fact_check_notes   text,
  discovered_by      uuid references public.employees(id) on delete set null,
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (company_id, slug)
);
create index trends_company_score_idx on public.trends(company_id, current_score desc);

create table public.trend_sources (
  trend_id    uuid not null references public.trends(id) on delete cascade,
  source_id   uuid not null references public.sources(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  primary key (trend_id, source_id)
);

create table public.trend_snapshots (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  trend_id       uuid not null references public.trends(id) on delete cascade,
  snapshot_date  date not null,
  current_score  int not null,
  growth_score   int not null,
  mention_count  int not null,
  unique (trend_id, snapshot_date)
);

-- ---------------------------------------------------------------------
-- Opportunities / Content
-- ---------------------------------------------------------------------
create table public.opportunities (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  run_id             uuid references public.workday_runs(id) on delete set null,
  trend_id           uuid references public.trends(id) on delete set null,
  project_id         uuid references public.projects(id) on delete set null,
  title              text not null,
  trend              text,
  problem            text,
  solution           text,
  target_user        text,
  market             text,
  competition        text,
  business_model     text,
  product_idea       text,
  difficulty         text not null default 'medium' check (difficulty in ('low', 'medium', 'high')),
  development_time   text,
  opportunity_score  int not null default 0 check (opportunity_score between 0 and 100),
  status             text not null default 'IDEA' check (status in ('IDEA', 'RESEARCHING', 'VALIDATING', 'BUILD', 'LAUNCHED', 'ARCHIVED')),
  created_by         uuid references public.employees(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index opportunities_company_idx on public.opportunities(company_id, opportunity_score desc);

create table public.content_ideas (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  run_id              uuid references public.workday_runs(id) on delete set null,
  trend_id            uuid references public.trends(id) on delete set null,
  project_id          uuid references public.projects(id) on delete set null,
  title               text not null,
  trend               text,
  angle               text,
  platform            text not null check (platform in ('instagram', 'threads', 'blog', 'reels')),
  content_type        text,
  hook                text,
  body                jsonb not null default '{}'::jsonb,
  score_trend         int not null default 0 check (score_trend between 0 and 20),
  score_originality   int not null default 0 check (score_originality between 0 and 20),
  score_audience_fit  int not null default 0 check (score_audience_fit between 0 and 20),
  score_save          int not null default 0 check (score_save between 0 and 20),
  score_share         int not null default 0 check (score_share between 0 and 20),
  score_brand_fit     int not null default 0 check (score_brand_fit between 0 and 20),
  total_score         int not null default 0 check (total_score between 0 and 100),
  priority            text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status              text not null default 'IDEA' check (status in ('IDEA', 'WRITING', 'DESIGN', 'CEO_REVIEW', 'SCHEDULED', 'PUBLISHED')),
  scheduled_for       date,
  published_at        timestamptz,
  created_by          uuid references public.employees(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index content_ideas_company_idx on public.content_ideas(company_id, total_score desc);

create table public.content_posts (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  content_idea_id   uuid not null references public.content_ideas(id) on delete cascade,
  platform          text not null,
  url               text,
  published_at      timestamptz,
  views             int not null default 0,
  likes             int not null default 0,
  comments          int not null default 0,
  saves             int not null default 0,
  shares            int not null default 0,
  followers_gained  int not null default 0,
  recorded_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Meetings
-- ---------------------------------------------------------------------
create table public.meetings (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  run_id          uuid references public.workday_runs(id) on delete set null,
  project_id      uuid references public.projects(id) on delete set null,
  type            text not null check (type in ('morning', 'team', 'executive', 'project')),
  topic           text not null,
  status          text not null default 'in_progress' check (status in ('scheduled', 'in_progress', 'completed')),
  rounds          int not null default 0,
  coordinator_id  uuid references public.employees(id) on delete set null,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  created_at      timestamptz not null default now()
);
create index meetings_company_idx on public.meetings(company_id, created_at desc);

create table public.meeting_participants (
  meeting_id   uuid not null references public.meetings(id) on delete cascade,
  employee_id  uuid not null references public.employees(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  primary key (meeting_id, employee_id)
);

create table public.meeting_messages (
  id           uuid primary key default gen_random_uuid(),
  meeting_id   uuid not null references public.meetings(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  employee_id  uuid references public.employees(id) on delete set null,
  round        int not null default 1,
  stance       text not null default 'opinion' check (stance in ('opinion', 'agree', 'disagree', 'supplement', 'summary')),
  reply_to     uuid references public.meeting_messages(id) on delete set null,
  content      text not null,
  created_at   timestamptz not null default now()
);
create index meeting_messages_meeting_idx on public.meeting_messages(meeting_id, round, created_at);

create table public.meeting_minutes (
  id                     uuid primary key default gen_random_uuid(),
  meeting_id             uuid not null unique references public.meetings(id) on delete cascade,
  company_id             uuid not null references public.companies(id) on delete cascade,
  topic                  text not null,
  participants           jsonb not null default '[]'::jsonb,
  discussion             text,
  arguments              jsonb not null default '[]'::jsonb,
  consensus              text,
  disagreements          jsonb not null default '[]'::jsonb,
  decision               text,
  action_items           jsonb not null default '[]'::jsonb,
  ceo_approval_required  boolean not null default false,
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Approvals / Memory / Performance / Briefs
-- ---------------------------------------------------------------------
create table public.approvals (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  run_id               uuid references public.workday_runs(id) on delete set null,
  project_id           uuid references public.projects(id) on delete set null,
  title                text not null,
  type                 text not null default 'other' check (type in ('research', 'opportunity', 'content', 'strategy', 'project', 'promotion', 'budget', 'other')),
  summary              text,
  reason               text,
  impact               text,
  recommendation       text,
  alternatives         jsonb not null default '[]'::jsonb,
  cost                 text,
  employee_id          uuid references public.employees(id) on delete set null,
  related_entity_type  text,
  related_entity_id    uuid,
  status               text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'MORE_RESEARCH', 'REVISION', 'ON_HOLD')),
  decision_note        text,
  feedback_tags        text[] not null default '{}',
  decided_at           timestamptz,
  created_at           timestamptz not null default now()
);
create index approvals_company_status_idx on public.approvals(company_id, status, created_at desc);

create table public.company_memory (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  category             text not null check (category in (
                         'ceo_preferences', 'brand_identity', 'content_strategy', 'rejected_ideas', 'approved_ideas',
                         'best_content', 'bad_content', 'current_projects', 'business_interests', 'research_interests', 'past_decisions')),
  content              text not null,
  source               text not null default 'ceo' check (source in ('ceo', 'feedback', 'system', 'agent')),
  weight               int not null default 1,
  related_entity_type  text,
  related_entity_id    uuid,
  created_at           timestamptz not null default now()
);
create index company_memory_company_idx on public.company_memory(company_id, category, created_at desc);

create table public.employee_performance (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  employee_id          uuid not null references public.employees(id) on delete cascade,
  period_date          date not null,
  accuracy             numeric(5,2) not null default 0,
  approval_rate        numeric(5,2) not null default 0,
  useful_insight       numeric(5,2) not null default 0,
  originality          numeric(5,2) not null default 0,
  task_completion      numeric(5,2) not null default 0,
  content_performance  numeric(5,2) not null default 0,
  overall              numeric(5,2) not null default 0,
  ceo_rating           int check (ceo_rating between 1 and 5),
  notes                text,
  created_at           timestamptz not null default now(),
  unique (employee_id, period_date)
);

create table public.daily_briefs (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  run_id               uuid references public.workday_runs(id) on delete set null,
  brief_date           date not null,
  title                text not null,
  executive_summary    text,
  ai_trends            jsonb not null default '[]'::jsonb,
  vibe_coding          jsonb not null default '[]'::jsonb,
  opportunities        jsonb not null default '[]'::jsonb,
  content_ideas        jsonb not null default '[]'::jsonb,
  things_to_try        jsonb not null default '[]'::jsonb,
  competitor_movement  jsonb not null default '[]'::jsonb,
  important_decisions  jsonb not null default '[]'::jsonb,
  approval_ids         uuid[] not null default '{}',
  created_at           timestamptz not null default now(),
  unique (company_id, brief_date)
);

-- ---------------------------------------------------------------------
-- Notion
-- ---------------------------------------------------------------------
create table public.notion_connections (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null unique references public.companies(id) on delete cascade,
  auth_type         text not null check (auth_type in ('oauth', 'token', 'env')),
  access_token_enc  text,          -- AES-256-GCM 암호화. authenticated 역할은 SELECT 불가 (rls.sql 참고)
  workspace_id      text,
  workspace_name    text,
  bot_id            text,
  parent_page_id    text,
  root_page_id      text,
  status            text not null default 'connected' check (status in ('connected', 'needs_setup', 'error', 'disconnected')),
  last_error        text,
  connected_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.notion_databases (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  key             text not null check (key in ('daily_brief', 'ai_trends', 'vibe_coding', 'opportunities', 'content_ideas', 'meetings', 'ceo_decisions', 'projects')),
  database_id     text not null,
  data_source_id  text not null,
  title           text not null,
  created_at      timestamptz not null default now(),
  unique (company_id, key)
);

create table public.notion_sync_queue (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  entity_type      text not null check (entity_type in ('daily_brief', 'trend', 'opportunity', 'content_idea', 'meeting', 'approval', 'project')),
  entity_id        uuid not null,
  action           text not null default 'upsert' check (action in ('upsert')),
  status           text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'DONE', 'FAILED')),
  retry_count      int not null default 0,
  error            text,
  notion_page_id   text,
  next_attempt_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  synced_at        timestamptz
);
create index notion_sync_queue_pending_idx on public.notion_sync_queue(status, next_attempt_at);
create unique index notion_sync_queue_open_unique
  on public.notion_sync_queue(entity_type, entity_id) where status in ('PENDING', 'PROCESSING');

create table public.notion_pages (
  company_id   uuid not null references public.companies(id) on delete cascade,
  entity_type  text not null,
  entity_id    uuid not null,
  page_id      text not null,
  updated_at   timestamptz not null default now(),
  primary key (entity_type, entity_id)
);

-- ---------------------------------------------------------------------
-- AI usage
-- ---------------------------------------------------------------------
create table public.ai_usage (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  run_id            uuid references public.workday_runs(id) on delete set null,
  task_id           uuid references public.tasks(id) on delete set null,
  employee_id       uuid references public.employees(id) on delete set null,
  agent             text not null,
  model             text not null,
  purpose           text,
  input_tokens      int not null default 0,
  output_tokens     int not null default 0,
  cached_tokens     int not null default 0,
  web_search_calls  int not null default 0,
  estimated_cost    numeric(12,6) not null default 0,
  success           boolean not null default true,
  error             text,
  created_at        timestamptz not null default now()
);
create index ai_usage_company_created_idx on public.ai_usage(company_id, created_at desc);
create index ai_usage_employee_created_idx on public.ai_usage(employee_id, created_at desc);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['companies', 'company_settings', 'projects', 'tasks', 'trends', 'opportunities', 'content_ideas', 'notion_connections']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- New auth user → profile
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
