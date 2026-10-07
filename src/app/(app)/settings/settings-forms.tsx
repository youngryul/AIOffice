"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/app/submit-button";
import { MEMORY_LABELS } from "@/lib/labels";
import { MEMORY_CATEGORIES, type WorkSchedule } from "@/lib/types/domain";
import { addMemoryItem, updateCompany, updateWorkSettings, type SettingsState } from "./actions";

function useResult(state: SettingsState, ok: string, onOk?: () => void) {
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) {
      toast.success(ok);
      onOk?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

export function CompanyForm(props: {
  name: string;
  mission: string | null;
  goals: string | null;
  brand_direction: string | null;
  interests: string[];
  brand_topics: string[];
  research_keywords: string[];
}) {
  const [state, action] = useActionState<SettingsState, FormData>(updateCompany, {});
  useResult(state, "회사 설정을 저장했습니다.");
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="회사 이름">
        <Input name="name" defaultValue={props.name} required maxLength={100} />
      </Field>
      <Field label="미션">
        <Input name="mission" defaultValue={props.mission ?? ""} maxLength={500} />
      </Field>
      <Field label="회사 목표" className="sm:col-span-2">
        <Textarea name="goals" defaultValue={props.goals ?? ""} maxLength={2000} placeholder="예: 바이브코딩 분야 1등 크리에이터 + 매달 사이드 프로젝트 1개 출시" />
      </Field>
      <Field label="브랜드 방향" className="sm:col-span-2">
        <Textarea name="brand_direction" defaultValue={props.brand_direction ?? ""} maxLength={1000} />
      </Field>
      <Field label="CEO 관심 분야 (쉼표 구분)" className="sm:col-span-2">
        <Input name="interests" defaultValue={props.interests.join(", ")} />
      </Field>
      <Field label="브랜드 주제 (쉼표 구분)">
        <Input name="brand_topics" defaultValue={props.brand_topics.join(", ")} />
      </Field>
      <Field label="조사 키워드 (쉼표 구분)">
        <Input name="research_keywords" defaultValue={props.research_keywords.join(", ")} />
      </Field>
      <div>
        <SubmitButton pendingText="저장 중…">저장</SubmitButton>
      </div>
    </form>
  );
}

const SCHEDULE_LABELS: [keyof WorkSchedule, string][] = [
  ["start", "출근"],
  ["morning_meeting", "Morning Meeting"],
  ["research", "Research"],
  ["team_review", "Team Review"],
  ["content", "Content / Strategy"],
  ["manager_review", "Manager Review"],
  ["executive_meeting", "Executive Meeting"],
  ["ceo_report", "CEO Report"],
  ["end", "퇴근"],
];
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function WorkSettingsForm(props: {
  timezone: string;
  work_mode: "REAL" | "FAST";
  monthly_budget_usd: number;
  ai_enabled: boolean;
  workdays: number[];
  schedule: WorkSchedule;
}) {
  const [state, action] = useActionState<SettingsState, FormData>(updateWorkSettings, {});
  useResult(state, "근무 설정을 저장했습니다.");
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="업무 모드" hint="FAST: 버튼으로 즉시 실행 · REAL: 근무시간에 Cron 이 자동 실행">
          <NativeSelect name="work_mode" defaultValue={props.work_mode}>
            <option value="FAST">FAST MODE</option>
            <option value="REAL">REAL MODE</option>
          </NativeSelect>
        </Field>
        <Field label="타임존">
          <Input name="timezone" defaultValue={props.timezone} />
        </Field>
        <Field label="월 AI 예산 (USD)" hint="초과 시 모든 AI 업무 중단">
          <Input name="monthly_budget_usd" type="number" step="1" min="0" defaultValue={props.monthly_budget_usd} />
        </Field>
        <label className="flex items-center gap-2 self-center text-sm">
          <input type="checkbox" name="ai_enabled" defaultChecked={props.ai_enabled} className="size-4" />
          AI 업무 활성화
        </label>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">근무 요일</legend>
        <div className="flex flex-wrap gap-3">
          {DAYS.map((d, i) => (
            <label key={d} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="workdays" value={i} defaultChecked={props.workdays.includes(i)} className="size-4" />
              {d}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SCHEDULE_LABELS.map(([key, label]) => (
          <Field key={key} label={label}>
            <Input type="time" name={`schedule_${key}`} defaultValue={props.schedule[key]} required />
          </Field>
        ))}
      </div>
      <div>
        <SubmitButton pendingText="저장 중…">저장</SubmitButton>
      </div>
    </form>
  );
}

export function MemoryForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<SettingsState, FormData>(addMemoryItem, {});
  useResult(state, "회사 기억에 추가했습니다.", () => ref.current?.reset());
  return (
    <form ref={ref} action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <Field label="분류">
        <NativeSelect name="category" defaultValue="ceo_preferences">
          {MEMORY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {MEMORY_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="내용" className="flex-1">
        <Input name="content" required placeholder="예: 숫자가 들어간 Hook 을 선호함 / 코인 관련 주제는 다루지 않음" maxLength={1000} />
      </Field>
      <SubmitButton>추가</SubmitButton>
    </form>
  );
}
