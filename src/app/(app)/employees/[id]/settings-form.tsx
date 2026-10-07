"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/app/submit-button";
import { rateEmployee, updateEmployeeSettings, type ActionState } from "../actions";

interface EmployeeSettings {
  id: string;
  name: string;
  model: string | null;
  daily_budget: number;
  token_budget: number;
  personality: string | null;
  system_prompt: string | null;
  interests: string[];
  specialty: string[];
}

export function EmployeeSettingsForm({ employee, defaultModel }: { employee: EmployeeSettings; defaultModel: string }) {
  const [state, action] = useActionState<ActionState, FormData>(updateEmployeeSettings.bind(null, employee.id), {});
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) toast.success("직원 설정을 저장했습니다.");
  }, [state]);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="이름">
        <Input name="name" defaultValue={employee.name} required maxLength={40} />
      </Field>
      <Field label="AI 모델" hint={`비우면 직급 기본 모델(${defaultModel}) 사용`}>
        <Input name="model" defaultValue={employee.model ?? ""} placeholder={defaultModel} />
      </Field>
      <Field label="일일 API 예산 (USD)" hint="초과하면 그날 업무를 중단합니다">
        <Input name="daily_budget" type="number" step="0.01" min="0" defaultValue={employee.daily_budget} />
      </Field>
      <Field label="호출당 최대 출력 토큰 (token budget)">
        <Input name="token_budget" type="number" step="1000" min="1000" defaultValue={employee.token_budget} />
      </Field>
      <Field label="관심 분야 (쉼표 구분)" className="sm:col-span-2">
        <Input name="interests" defaultValue={employee.interests.join(", ")} placeholder="예: AI Agent, MCP" />
      </Field>
      <Field label="전문 분야 / 담당 업무 (쉼표 구분)" className="sm:col-span-2">
        <Input name="specialty" defaultValue={employee.specialty.join(", ")} />
      </Field>
      <Field label="업무 성향 (Personality)" className="sm:col-span-2">
        <Textarea name="personality" defaultValue={employee.personality ?? ""} maxLength={500} />
      </Field>
      <Field label="CEO 추가 지시 (System Prompt)" hint="이 직원에게만 적용되는 추가 업무 지시" className="sm:col-span-2">
        <Textarea name="system_prompt" defaultValue={employee.system_prompt ?? ""} maxLength={4000} />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton pendingText="저장 중…">설정 저장</SubmitButton>
      </div>
    </form>
  );
}

export function RatingForm({ employeeId, current }: { employeeId: string; current: number | null }) {
  const [rating, setRating] = useState(current ?? 0);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-2">
      <div className="flex gap-1" role="radiogroup" aria-label="CEO 평가">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            onClick={() => setRating(n)}
            className={`text-2xl transition-transform hover:scale-110 ${n <= rating ? "" : "opacity-30 grayscale"}`}
          >
            ⭐
          </button>
        ))}
      </div>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="평가 메모 (선택)" className="min-h-14" />
      <Button
        size="sm"
        className="w-fit"
        disabled={!rating || pending}
        onClick={() =>
          startTransition(async () => {
            await rateEmployee(employeeId, rating, notes);
            toast.success("평가를 저장했습니다.");
          })
        }
      >
        평가 저장
      </Button>
    </div>
  );
}
