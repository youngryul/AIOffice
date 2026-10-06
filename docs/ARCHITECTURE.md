# AI Office — Architecture

AI Office는 "AI 캐릭터 놀이"가 아니라 **AI 조직이 실제 업무 프로세스를 수행하는 것**을 목표로 합니다.
이 문서는 코드가 어떻게 그 프로세스를 구현하는지 설명합니다.

## 1. 전체 구조

```
Browser (CEO)
  │  Server Components (RLS 적용된 사용자 세션으로 조회)
  │  Server Actions (승인/반려/채용/설정 등 — RLS 적용)
  ▼
Next.js (Vercel)
  ├─ /api/workday/*        FAST MODE: 업무 사이클 시작 / 단계 진행 / 상태 조회
  ├─ /api/cron/tick        REAL MODE 스케줄러 + 멈춘 Run 재개 + Notion Sync
  ├─ /api/cron/notion-sync Notion Sync Queue 처리
  └─ /api/notion/oauth/*   Notion OAuth
        │
        ├─ lib/agents   (Workflow Engine, Prompt, Structured Output Schema)
        ├─ lib/tools    (webSearch adapter, memory, trendSearch, context ...)
        ├─ lib/ai       (OpenAI 호출, 비용 계산, 예산 체크, 사용량 기록)
        ├─ lib/notion   (Adapter, Workspace 생성, Mapper, Sync Queue Worker)
        └─ lib/supabase (server / browser / admin client)
        ▼
Supabase (Postgres + Auth + RLS + pg_cron)
        ▼
Notion API (비동기, Queue 경유)
```

## 2. 업무 프로세스 (Workflow Engine)

모든 하루 업무는 `workday_runs` 행 하나로 표현되는 **상태 머신**입니다.
각 단계(stage)는 독립적으로 실행되며, 한 번의 HTTP 호출은 한 단계만 처리합니다.
→ Vercel 함수 타임아웃에 안전하고, 중간에 실패해도 그 단계부터 재개됩니다.

| Stage | 담당 | 결과 | 원칙 매핑 |
|---|---|---|---|
| `morning_meeting` | Chief of Staff | 오늘의 Task 생성, Morning Meeting 회의록 | Task |
| `research` | Research 직원들(병렬) | `task_results`, `sources` | Research → Individual Analysis |
| `team_review` | Fact Checker 또는 Manager 이상 | 중복 제거, 팩트체크, Trend 등록 | Team Review / Manager Review |
| `analysis` | Business Analyst | `opportunities` | Individual Analysis |
| `content` | Content Strategist | `content_ideas` (점수 포함) | Content |
| `executive_meeting` | 참가자 전원 + Coordinator | 2라운드 토론, `meeting_minutes` | Meeting |
| `executive_summary` | Chief of Staff (Executive) | `daily_briefs`, `approvals`, Notion Queue | Executive Summary → CEO Approval |

이후 CEO가 `/approvals`에서 결재하면 **Execution**(후속 Task 생성/상태 변경) → **Archive**(`company_memory`) → **Notion Sync** 가 이어집니다.

- 잠금: `locked_until` 컬럼으로 동시에 같은 Run이 두 번 진행되지 않게 합니다.
- 재시도: AI 호출 최대 2회 재시도, 단계 실패 최대 2회 재시도 후 Run `failed`.
- 예산: 모든 AI 호출 전 직원 일일 예산 / 회사 월 예산 확인. 초과 시 해당 업무 중단(`FAILED`, `last_error`).

## 3. 직급 시스템

`lib/agents/positions.ts` 에서 직급별 **권한 / 모델 등급 / token budget / 사용 가능 Tool**을 정의합니다.
직원이 실제 사용하는 Tool = 역할(Role)이 필요로 하는 Tool ∩ 직급이 허용하는 Tool.
Team Review 단계는 `review` 권한(Manager 이상)이 있는 직원만 수행할 수 있습니다.

## 4. Structured Output

모든 AI 출력은 `lib/agents/schemas.ts`의 Zod 스키마 + OpenAI Structured Output(`responses.parse`)으로 받습니다.
자유 장문 텍스트는 저장하지 않습니다. AI가 고른 ID 대신 **인덱스**를 받아 코드에서 검증합니다(환각 ID 방지).

## 5. Source / Prompt Injection 방어

- 웹 검색 결과는 `<UNTRUSTED_EXTERNAL_CONTENT>`로 감싸 전달하며, 시스템 프롬프트에서 그 안의 지시를 따르지 않도록 명시합니다.
- 출처 URL은 http(s)만 허용하고, 실제 검색에서 수집된 URL과 일치하는 경우만 `is_verified = true`.
- 검증된 출처가 없는 Finding은 `is_speculation`으로 표시되며 팩트체크를 통과하지 못하면 CEO 보고서에 포함되지 않습니다.

## 6. Notion 연동

```
AI Result → Supabase → notion_sync_queue → (Worker) → Notion API
```
AI Workflow는 Notion을 직접 호출하지 않습니다. Queue Worker가 최대 3회 재시도(지수 backoff)합니다.
Notion API `2025-09-03`(data source) 기준으로 Database 생성 시 `data_source_id`를 저장해 페이지를 생성합니다.

## 7. Multi Tenant / RLS

- 모든 업무 테이블은 `company_id`를 가집니다.
- `public.current_company_id()` (security definer)가 `auth.uid() → profiles.company_id` 를 반환하고, 모든 RLS 정책이 이를 사용합니다.
- `profiles.company_id`는 사용자가 직접 수정할 수 없습니다(컬럼 권한 제한). 따라서 프론트에서 company_id를 바꿔도 다른 회사 데이터에 접근할 수 없습니다.
- Service Role(admin) 클라이언트는 서버에서만 사용하며, 항상 인증된 사용자의 profile에서 읽은 company_id로만 범위를 제한합니다.
- Notion 토큰은 AES-256-GCM으로 암호화 저장되고, `authenticated` 역할에서는 토큰 컬럼 SELECT 권한 자체가 없습니다.

## 8. 폴더 구조

```
src/
  app/
    (auth)/login, (auth)/signup, auth/callback     인증
    onboarding/                                     7단계 온보딩
    (app)/dashboard, office, employees, tasks, research, trends,
          opportunities, content, content/calendar, meetings,
          approvals, projects, notion, settings     앱 화면
    api/workday, api/cron, api/notion               API Routes
  components/ui        shadcn/ui 스타일 기본 컴포넌트
  components/app       레이아웃, Office View, 카드 등
  lib/agents           roles, positions, prompts/, schemas, workflow/
  lib/tools            webSearch(adapter), memory, trendSearch, context ...
  lib/ai               openai client, pricing, usage/budget
  lib/notion           client, schema, mappers, setup, sync, oauth
  lib/supabase         server, browser, admin, proxy
  lib/services         도메인 서비스 (approvals, employees, demo ...)
  lib/types            공통 도메인 타입
supabase/migrations    스키마 + RLS + cron SQL
```
