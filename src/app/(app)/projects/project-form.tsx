"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/app/submit-button";
import { createProject, type ProjectActionState } from "./actions";

export function ProjectForm() {
  const [state, action] = useActionState<ProjectActionState, FormData>(createProject, {});
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="프로젝트 이름">
        <Input name="name" required placeholder="예: AI 외국어 회화 앱 만들기" maxLength={100} />
      </Field>
      <Field label="Goal">
        <Input name="goal" placeholder="예: 3개월 안에 유료 사용자 100명" maxLength={500} />
      </Field>
      <Field label="설명" className="sm:col-span-2">
        <Textarea name="description" maxLength={2000} />
      </Field>
      <Field label="지속 조사 키워드 (쉼표 구분)" className="sm:col-span-2">
        <Input name="keywords" placeholder="speaking app, AI tutor, voice AI" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="auto_research" defaultChecked className="size-4" />
        AI 리서처들이 이 프로젝트 관련 정보를 매일 조사
      </label>
      <div className="sm:text-right">
        <SubmitButton pendingText="생성 중…">프로젝트 생성</SubmitButton>
      </div>
    </form>
  );
}
