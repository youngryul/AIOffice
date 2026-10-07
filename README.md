# 🏢 AI Office

> AI 직원들을 고용하고 운영하는 가상의 회사. 당신은 CEO 입니다.

AI 직원들이 정해진 업무시간에 출근해서 **조사 → 팩트체크 → 분석 → 회의 → 직급별 검토 → CEO 결재**를 거쳐
매일 아침 **CEO Morning Brief** 를 만듭니다. 결과는 Supabase 에 저장되고 Notion 에도 자동으로 정리됩니다.

앱을 열면 10분 안에 다음을 알 수 있도록 하는 것이 목표입니다.

- 오늘 AI 업계에서 무슨 일이 있었는지 (AI Trend TOP 5)
- 바이브코딩 업계의 변화 (Vibe Coding TOP 3)
- 어떤 사업 기회가 있는지 (Business Opportunity TOP 3)
- 어떤 콘텐츠를 만들어야 하는지 (Content Idea TOP 5)
- 무엇을 직접 테스트해봐야 하는지 (Things To Try)

---

## 목차

1. [기술 스택](#기술-스택)
2. [빠른 시작 (로컬)](#빠른-시작-로컬)
3. [Supabase 설정](#supabase-설정)
4. [OpenAI API 설정](#openai-api-설정)
5. [Notion Integration 설정](#notion-integration-설정)
6. [Vercel 배포](#vercel-배포)
7. [Cron 설정 (REAL MODE / Notion Sync)](#cron-설정)
8. [AI 업무 프로세스](#ai-업무-프로세스)
9. [프로젝트 구조](#프로젝트-구조)
10. [테스트](#테스트)
11. [문제 해결](#문제-해결)

아키텍처 상세는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 를 참고하세요.

---

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, shadcn/ui 스타일 컴포넌트 (Radix UI) |
| Backend | Next.js Server Actions + Route Handlers |
| DB / Auth | Supabase PostgreSQL + Supabase Auth + RLS |
| AI | OpenAI Responses API + Structured Output (Zod) + 내장 web_search |
| 검색 | Adapter 구조 — OpenAI web_search(기본) / Tavily |
| Scheduler | Supabase Cron(pg_cron + pg_net, 권장) 또는 Vercel Cron |
| Notion | Notion API `2025-09-03` (data source), OAuth 또는 Integration Token |
| 배포 | Vercel |

---

## 빠른 시작 (로컬)

### 0. 준비물

- Node.js 20 이상 (개발: v24)
- Docker Desktop (로컬 Supabase 실행용)
- OpenAI API Key (AI 업무 실행 시 필요. 없어도 앱과 데모 데이터는 동작합니다)

### 1. 설치

```bash
npm install
```

### 2. 로컬 Supabase 실행

```bash
npx supabase start
```

처음 실행하면 Docker 이미지를 내려받느라 몇 분 걸립니다.
`supabase/migrations/` 의 스키마 · RLS · 함수가 자동으로 적용됩니다.
실행이 끝나면 `API URL`, `Publishable key`, `Secret key` 가 출력됩니다 (`npx supabase status` 로 다시 볼 수 있습니다).

### 3. 환경변수

```bash
cp .env.example .env.local
```

`.env.local` 에 최소한 아래 값을 채웁니다.

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase start 출력의 Publishable key>
SUPABASE_SECRET_KEY=<supabase start 출력의 Secret key>
APP_URL=http://localhost:3000
APP_ENCRYPTION_KEY=<32자 이상 랜덤 문자열>
CRON_SECRET=<랜덤 문자열>
OPENAI_API_KEY=sk-...
```

랜덤 문자열 생성:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. 실행

```bash
npm run dev
```

http://localhost:3000 → 회원가입 → 7단계 온보딩 → Dashboard.
로컬 Supabase 는 이메일 인증이 꺼져 있어 가입 즉시 로그인됩니다.

### 5. 첫 업무 사이클 (FAST MODE)

Dashboard 또는 Office 화면에서 **"오늘 업무 실행 (FAST MODE)"** 을 누르면
하루 업무(Morning Meeting → Research → Team Review → Analysis → Content → Executive Meeting → CEO Report)가
몇 분 안에 진행되고, 끝나면 CEO Brief 와 결재 안건이 생깁니다.

> 💡 비용: 기본 설정(직원 5명, gpt-5-mini / gpt-5) 기준 1회 사이클은 대략 수십 센트 수준입니다.
> 실제 비용은 Dashboard 의 AI 비용 카드에서 직원/부서별로 확인할 수 있고, 직원별 일일 예산과 회사 월 예산을 넘으면 업무가 자동 중단됩니다.

---

## Supabase 설정

### 클라우드 프로젝트 만들기

1. https://supabase.com 에서 새 프로젝트 생성
2. **Project Settings → API Keys** 에서 다음 값을 확인
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Secret key (`sb_secret_...`) → `SUPABASE_SECRET_KEY`
   - (레거시 `anon` / `service_role` 키도 `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 이름으로 사용 가능)

### 마이그레이션 적용

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

또는 Dashboard → SQL Editor 에서 `supabase/migrations/` 의 파일 3개를 **이름 순서대로** 실행해도 됩니다.

| 파일 | 내용 |
|---|---|
| `20261006000001_schema.sql` | 29개 테이블, 인덱스, `updated_at` 트리거, 가입 시 profile 자동 생성 트리거 |
| `20261006000002_rls.sql` | 모든 테이블 RLS, 컬럼 권한(토큰/`company_id` 보호) |
| `20261006000003_functions.sql` | 비용 집계, Notion 작업 claim(동시성 안전), 예산 조회 함수 |

### Auth 설정

**Authentication → URL Configuration**

- Site URL: `https://<your-domain>` (로컬은 `http://localhost:3000`)
- Redirect URLs: `https://<your-domain>/auth/callback`, `http://localhost:3000/auth/callback`

이메일 인증(Confirm email)을 켜 두면 가입 후 메일 링크 → `/auth/callback` → 온보딩으로 이동합니다.

### RLS 원칙

- 모든 업무 데이터는 `company_id` 를 가집니다.
- `auth.uid() → profiles.company_id` 를 반환하는 `current_company_id()` 로 모든 정책을 검사합니다.
- `profiles.company_id` 는 사용자가 수정할 수 없습니다 → 프론트엔드에서 company_id 를 바꿔도 다른 회사 데이터는 보이지 않습니다.
- `ai_usage`, `workday_runs` 는 클라이언트 쓰기 금지(서버만 기록), Notion 토큰 컬럼은 `authenticated` 역할에 SELECT 권한 자체가 없습니다.
- 격리 테스트: `supabase/tests/rls_test.sql` (아래 [테스트](#테스트) 참고)

### DB 타입 재생성

스키마를 바꿨다면:

```bash
npm run db:types
```

---

## OpenAI API 설정

1. https://platform.openai.com/api-keys 에서 키 발급 → `OPENAI_API_KEY`
2. 직급별 기본 모델 (직원 상세 화면에서 직원마다 덮어쓰기 가능)

| 환경변수 | 직급 | 기본값 |
|---|---|---|
| `AI_MODEL_JUNIOR` | Intern / Associate | `gpt-5-mini` |
| `AI_MODEL_SENIOR` | Senior / Manager | `gpt-5-mini` |
| `AI_MODEL_EXECUTIVE` | Director / Executive | `gpt-5` |

3. 비용 계산용 가격표는 `src/lib/ai/pricing.ts` 에 있습니다. 다른 모델을 쓰거나 가격이 바뀌면
   `AI_PRICING_JSON='{"모델명":{"input":1.25,"cachedInput":0.125,"output":10}}'` 로 덮어쓰세요 (USD / 1M tokens).
   알 수 없는 모델은 비용을 과소 추정하지 않도록 보수적인 가격으로 계산합니다.
4. 사용하는 모델은 **Structured Output** 과 **web_search tool** 을 지원해야 합니다.

### 검색 Adapter

| `SEARCH_PROVIDER` | 동작 |
|---|---|
| `openai` (기본) | 리서처 호출에 OpenAI 내장 `web_search` tool 을 붙이고, 실제 검색된 URL 로 출처를 검증 |
| `tavily` | `TAVILY_API_KEY` 로 먼저 검색 → 결과를 `<UNTRUSTED_EXTERNAL_CONTENT>` 로 감싸 프롬프트에 전달 |

새 검색 API 는 `src/lib/tools/webSearch/index.ts` 의 `WebSearchProvider` 를 구현해 추가합니다.

---

## Notion Integration 설정

AI Workflow 는 Notion 을 직접 호출하지 않습니다.
`AI Result → Supabase → notion_sync_queue → Worker → Notion API` 구조라 Notion 장애가 AI 업무를 멈추지 않으며, 실패 시 지수 backoff 로 최대 3회 재시도합니다.

처음 연결하면 선택한 페이지 아래에 **AI OFFICE** 페이지와 Database 8개를 자동 생성합니다.
`Daily Brief`, `AI Trends`, `Vibe Coding`, `Business Opportunities`, `Content Ideas`, `Meetings`, `CEO Decisions`, `Projects`

### 방법 A — OAuth (Public Integration, 권장)

1. https://www.notion.so/profile/integrations → **New integration** → Type: **Public**
2. Redirect URI: `https://<your-domain>/api/notion/oauth/callback` (로컬: `http://localhost:3000/api/notion/oauth/callback`)
3. Capabilities: Read content, Update content, Insert content
4. 환경변수 설정

```env
NOTION_OAUTH_CLIENT_ID=...
NOTION_OAUTH_CLIENT_SECRET=...
NOTION_OAUTH_REDIRECT_URI=https://<your-domain>/api/notion/oauth/callback
APP_ENCRYPTION_KEY=...   # 토큰 암호화
```

5. 앱의 **Notion** 메뉴 → "Notion 으로 연결" → Notion 화면에서 접근할 페이지 선택 → 앱에서 상위 페이지 선택 → 워크스페이스 자동 생성

### 방법 B — Internal Integration Token

1. https://www.notion.so/profile/integrations → **New integration** → Type: **Internal** → Secret(`ntn_...`) 복사
2. AI OFFICE 를 만들 Notion 페이지에서 `•••` → **Connections** → 만든 Integration 추가
3. 앱의 **Notion** 메뉴에서 토큰과 페이지 URL 입력 (토큰은 AES-256-GCM 으로 암호화 저장)
   - 또는 서버 환경변수 `NOTION_TOKEN` + `NOTION_PARENT_PAGE_ID` 를 설정하고 "환경변수 토큰으로 연결"

### 동기화

- 업무 사이클이 끝나면 Brief / 트렌드 / 사업기회 / 콘텐츠 / 회의록이 큐에 적재되고, CEO 결재 시 CEO Decisions 가 적재됩니다.
- Cron(`/api/cron/tick`)이 주기적으로 처리하며, Notion 화면의 "지금 동기화" 로 즉시 처리할 수 있습니다.
- 연결 전에 쌓인 데이터는 "최근 30일 데이터 전체 동기화" 로 한 번에 보낼 수 있습니다.

---

## Vercel 배포

1. GitHub 에 push 후 https://vercel.com/new 에서 Import
2. **Environment Variables** 에 `.env.example` 의 값 등록 (`APP_URL` 은 배포 도메인)
3. Deploy
4. Supabase Auth 의 Site URL / Redirect URLs 에 배포 도메인 추가
5. Notion OAuth 를 쓴다면 Redirect URI 를 배포 도메인으로 등록
6. [Cron 설정](#cron-설정)

> 업무 단계 하나(병렬 리서치 + 웹 검색)는 수 분이 걸릴 수 있어 `/api/workday/advance` 와 `/api/cron/tick` 은 `maxDuration = 300` 으로 설정되어 있습니다.
> Vercel 의 Fluid Compute(기본 활성)에서 동작합니다. 워크플로는 단계별로 나뉘어 있어 한 요청이 하루 전체를 처리하지 않습니다.

---

## Cron 설정

`/api/cron/tick` 이 하는 일:

1. **REAL MODE** 회사: 업무시간표에 맞춰 출근 → 단계별 실행 → 퇴근
2. 브라우저를 닫아 멈춘 **FAST MODE** 업무 사이클 이어서 진행
3. **Notion Sync Queue** 처리

모든 Cron 요청은 `Authorization: Bearer <CRON_SECRET>` 헤더가 필요합니다.

### 방법 A — Supabase Cron (권장, 5분 간격)

Supabase Dashboard → SQL Editor 에서 [`supabase/cron/schedule_cron.sql`](supabase/cron/schedule_cron.sql) 의
`<YOUR_APP_URL>`, `<YOUR_CRON_SECRET>` 을 바꿔 실행합니다. (pg_cron + pg_net + Vault 사용)

### 방법 B — Vercel Cron

`vercel.json` 에 기본 Cron 이 들어 있습니다 (Hobby 플랜 제한에 맞춰 하루 1회).
Vercel 은 `CRON_SECRET` 환경변수가 있으면 자동으로 Authorization 헤더를 붙입니다.
Pro 플랜이라면 `"schedule": "*/5 * * * *"` 로 바꿔 REAL MODE 를 Vercel Cron 만으로 운영할 수 있습니다.

### 수동 호출 (테스트)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/tick
```

### 기본 업무시간표 (설정 화면에서 변경)

| 시간 | 단계 |
|---|---|
| 09:00 | 출근 |
| 09:10 | Morning Meeting — 비서실장이 오늘 업무 배분 |
| 09:30 | Research — 리서처 병렬 조사 |
| 11:00 | Team Review — 중복 제거 · 팩트체크 · 트렌드 등록 |
| 13:00 | Content / Strategy — 사업기회 분석, 콘텐츠 기획 |
| 15:00 | Manager Review |
| 16:00 | Executive Meeting — 2라운드 토론 |
| 16:30 | CEO Report — Daily Brief + 결재 안건 + Notion 큐 |
| 17:00 | 퇴근 |

---

## AI 업무 프로세스

```
Task → Research → Individual Analysis → Team Review → Meeting → Manager Review
     → Executive Summary → CEO Approval → Execution → Archive → Notion Sync
```

| 단계 | 담당 | 결과 |
|---|---|---|
| Morning Meeting | 비서실장 | CEO 관심사 · 어제 트렌드 · 프로젝트 · 콘텐츠 성과 · CEO 후속 지시를 반영해 업무 배분 |
| Research | 리서처(병렬) | 표준 JSON(`summary/findings/sources/insights/recommendations/confidence/next_actions`), 출처 저장 |
| Team Review | 팩트체커 또는 Manager 이상 | URL·제목·의미 유사도 중복 제거, 출처/날짜/과장/수치 검증 → **통과한 것만** 트렌드 등록 |
| Analysis | 사업기회 분석가 | 4가지 시장 질문 + Opportunity (점수 0~100) |
| Content | 콘텐츠 기획자 | Trend → Angle → Instagram/Threads/Blog/Reels, 6개 항목 점수 |
| Executive Meeting | 참가자 + Coordinator | Round 1 의견 → Round 2 동의/반대/보완 → 회의록 |
| CEO Report | 비서실장(Executive) | Daily Brief, 결재 안건(`request_approval` 권한 필요), Notion 큐, 직원 평가 갱신 |
| CEO Approval | CEO | 승인/반려/추가 조사/수정 요청/보류 + 피드백 태그 → 후속 업무 생성, 회사 기억에 학습 |

### 직급 = 권한

| 직급 | 권한 | 모델 등급 | Tool |
|---|---|---|---|
| Intern / Associate | 자료 수집, 초안 | junior | 웹 검색, 회사 컨텍스트 (+메모리·트렌드·프로젝트) |
| Senior | + 비교, 평가 | senior | + 사내 DB |
| Manager | + 팀원 검토, 반려 | senior | 〃 |
| Director | + 여러 팀 종합, 전략 | executive | + Notion |
| Executive | + CEO 보고, 결재 요청, 위임 | executive | 〃 |

실제 사용 Tool = 역할이 필요로 하는 Tool ∩ 직급이 허용하는 Tool. 승진하면 Level · 모델 · Token Budget · 권한이 함께 바뀝니다.

### 안전장치

- **Structured Output**: 모든 AI 출력은 Zod 스키마로 강제, 점수는 저장 전 clamp, 다른 항목 참조는 index 로 받아 코드에서 검증
- **Prompt Injection 방어**: 웹 콘텐츠는 `UNTRUSTED_EXTERNAL_CONTENT` 로 취급, 태그 탈출 차단, 시스템 프롬프트에 데이터≠지시 명시
- **출처 검증**: 실제 검색 결과 URL 과 일치하는 출처만 `verified`, 출처 없는 내용은 `AI 추측` 으로 표시 후 팩트체크 탈락
- **비용**: 모든 호출을 `ai_usage` 에 기록, 직원 일일 예산 · 회사 월 예산 초과 시 중단
- **재시도**: AI 호출 최대 2회, 단계 실패 최대 2회, Notion Sync 최대 3회 (무한 재시도 없음)

---

## 프로젝트 구조

```
src/
  app/
    (auth)/login, signup        로그인 / 회원가입 (Server Actions)
    auth/callback               이메일 인증 콜백
    onboarding/                 7단계 온보딩
    setup/                      필수 환경변수 누락 시 안내
    (app)/                      대시보드 · 오피스 · 직원 · 업무 · 리서치 · 트렌드 · 사업기회
                                콘텐츠(+캘린더) · 회의 · 결재 · 프로젝트 · Notion · 설정
    api/workday/*               FAST MODE 시작 / 단계 진행 / 상태 / 중단
    api/cron/*                  Cron (tick, notion-sync)
    api/notion/oauth/*          Notion OAuth
  components/ui                 shadcn/ui 스타일 컴포넌트
  components/app                Office View, Brief, 업무 실행기 등
  lib/agents                    역할 · 직급 · 스키마 · 점수 · 중복제거 · 프롬프트 · 워크플로
  lib/agents/prompts            Role Prompt / Task Prompt / Safety (프롬프트는 별도 파일)
  lib/agents/workflow           엔진(상태머신) · 단계별 핸들러 · 회의 엔진 · 스케줄러
  lib/tools                     webSearch(adapter) · database · memory · trendSearch · companyContext · projectContext · notion
  lib/ai                        OpenAI 호출 · 가격 · 예산
  lib/notion                    client · schema · setup · mappers · sync · oauth
  lib/supabase                  server / browser / admin / proxy client, DB 타입
  lib/services                  세션 · 온보딩 · 데모 · 결재 · 성과 · 조회
supabase/
  migrations/                   스키마 + RLS + 함수
  tests/rls_test.sql            RLS 격리 테스트
  cron/schedule_cron.sql        Supabase Cron 설정 스크립트
tests/                          단위 테스트 / integration 테스트
```

---

## 테스트

```bash
npm run typecheck          # TypeScript
npm run lint               # ESLint
npm test                   # 단위 테스트 (점수, 중복 제거, 출처 검증, 시간대, 비용, 프롬프트 방어, 스케줄)
npm run test:integration   # 워크플로 통합 테스트 — 로컬 Supabase 필요, OpenAI 는 가짜 응답으로 대체
npm run build              # 프로덕션 빌드
```

RLS 격리 테스트 (로컬 Supabase):

```bash
docker exec -i supabase_db_ai-office psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/rls_test.sql
```

`RLS TESTS PASSED` 가 출력되면 성공입니다. (다른 회사 조회/삽입/이동, `company_id` 변경, 서버 전용 테이블 쓰기, 토큰 컬럼 조회, 익명 접근이 모두 차단되는지 확인)

---

## 문제 해결

| 증상 | 해결 |
|---|---|
| 모든 페이지가 "설정이 필요합니다" 로 이동 | Supabase 환경변수 3개 확인 후 서버 재시작 |
| 상단에 "OPENAI_API_KEY 가 설정되지 않아…" | `.env.local` 에 키 추가 후 서버 재시작 |
| 업무 사이클이 "예산 초과" 로 중단 | 설정 → 월 AI 예산, 또는 직원 상세 → 일일 예산 조정 |
| 리서치 결과가 모두 팩트체크에서 탈락 | 모델이 web_search 를 지원하는지 확인, 또는 `SEARCH_PROVIDER=tavily` |
| Notion "object_not_found" | Notion 페이지의 Connections 에 Integration 이 추가됐는지 확인 → "워크스페이스 점검" |
| Notion 작업이 FAILED | Notion 화면의 오류 메시지 확인 후 "실패 작업 재시도" |
| REAL MODE 인데 직원이 출근하지 않음 | Cron 설정, `CRON_SECRET`, 근무 요일/타임존 확인 |
| 브라우저를 닫아 FAST MODE 가 중간에 멈춤 | 페이지를 다시 열면 이어서 진행 (Cron 이 있으면 자동 재개) |
