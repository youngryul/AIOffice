"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Field, Input } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/app/submit-button";
import { recordPerformance, scheduleContent, type ContentActionState } from "./actions";

function useToast(state: ContentActionState, okMessage: string) {
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) toast.success(okMessage);
  }, [state, okMessage]);
}

export function ScheduleForm({ contentId, current }: { contentId: string; current: string | null }) {
  const [state, action] = useActionState<ContentActionState, FormData>(scheduleContent.bind(null, contentId), {});
  useToast(state, "발행일을 저장했습니다.");
  return (
    <form action={action} className="flex items-end gap-2">
      <Field label="발행 예정일">
        <Input type="date" name="date" defaultValue={current ?? ""} />
      </Field>
      <SubmitButton variant="outline" size="sm" className="h-9">
        저장
      </SubmitButton>
    </form>
  );
}

export function PerformanceForm({ contentId }: { contentId: string }) {
  const [state, action] = useActionState<ContentActionState, FormData>(recordPerformance.bind(null, contentId), {});
  useToast(state, "성과를 기록했습니다. 콘텐츠 전략 학습에 반영됩니다.");
  const fields = [
    ["views", "Views"],
    ["likes", "Likes"],
    ["comments", "Comments"],
    ["saves", "Saves"],
    ["shares", "Shares"],
    ["followers_gained", "Followers Gained"],
  ] as const;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      {fields.map(([name, label]) => (
        <Field key={name} label={label}>
          <Input type="number" name={name} min={0} defaultValue={0} required />
        </Field>
      ))}
      <Field label="게시물 URL (선택)" className="sm:col-span-2">
        <Input type="url" name="url" placeholder="https://www.instagram.com/p/..." />
      </Field>
      <div className="flex items-end">
        <SubmitButton pendingText="기록 중…">성과 기록</SubmitButton>
      </div>
    </form>
  );
}
