"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/app/submit-button";
import { hireEmployee, type ActionState } from "./actions";

export function HireForm({ roles, positions }: { roles: { key: string; label: string }[]; positions: { key: string; label: string }[] }) {
  const [state, action] = useActionState<ActionState, FormData>(hireEmployee, {});
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) toast.success("새 AI 직원을 채용했습니다!");
  }, [state]);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <Field label="역할">
        <NativeSelect name="role" required defaultValue="">
          <option value="" disabled>
            선택
          </option>
          {roles.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="이름 (선택)">
        <Input name="name" placeholder="기본 이름 사용" maxLength={40} />
      </Field>
      <Field label="직급 (선택)">
        <NativeSelect name="position" defaultValue="">
          <option value="">역할 기본 직급</option>
          {positions.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <SubmitButton pendingText="채용 중…">채용하기</SubmitButton>
    </form>
  );
}
