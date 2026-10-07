"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/app/submit-button";
import { createTask, type TaskActionState } from "./actions";

export function TaskForm({ employees, projectId }: { employees: { id: string; label: string }[]; projectId?: string }) {
  const [state, action] = useActionState<TaskActionState, FormData>(createTask, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) {
      toast.success("업무를 지시했습니다. 다음 업무 사이클에서 처리됩니다.");
      formRef.current?.reset();
    }
  }, [state]);
  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2">
      {projectId ? <input type="hidden" name="project_id" value={projectId} /> : null}
      <Field label="업무 제목" className="sm:col-span-2">
        <Input name="title" required placeholder="예: Claude Code 신규 기능 실사용 후기 조사" maxLength={200} />
      </Field>
      <Field label="설명 (선택)" className="sm:col-span-2">
        <Textarea name="description" placeholder="무엇을, 왜 조사해야 하는지" maxLength={2000} />
      </Field>
      <Field label="담당 직원">
        <NativeSelect name="assigned_employee" defaultValue="">
          <option value="">비서실장이 배정</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="우선순위">
        <NativeSelect name="priority" defaultValue="high">
          <option value="urgent">긴급</option>
          <option value="high">높음</option>
          <option value="medium">보통</option>
          <option value="low">낮음</option>
        </NativeSelect>
      </Field>
      <Field label="검색 키워드 (쉼표 구분)" className="sm:col-span-2">
        <Input name="keywords" placeholder="Claude Code, hooks, subagent" />
      </Field>
      <div>
        <SubmitButton pendingText="지시 중…">업무 지시</SubmitButton>
      </div>
    </form>
  );
}
