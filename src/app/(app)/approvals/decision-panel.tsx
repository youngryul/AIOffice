"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { FEEDBACK_TAGS } from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import { decideApprovalAction } from "./actions";

const DECISIONS = [
  { value: "APPROVED", label: "승인", variant: "default" },
  { value: "REJECTED", label: "반려", variant: "destructive" },
  { value: "MORE_RESEARCH", label: "추가 조사", variant: "outline" },
  { value: "REVISION", label: "수정 요청", variant: "outline" },
  { value: "ON_HOLD", label: "보류", variant: "ghost" },
] as const;

/** CEO 결재 버튼 + 피드백(이유) 입력 → company_memory 로 학습된다 */
export function DecisionPanel({ approvalId }: { approvalId: string }) {
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function decide(decision: (typeof DECISIONS)[number]["value"]) {
    startTransition(async () => {
      const res = await decideApprovalAction({ approvalId, decision, tags, note: note || null });
      if (res.error) toast.error(res.error);
      else toast.success("결재가 반영되었습니다. 피드백은 회사 기억에 저장됩니다.");
    });
  }

  return (
    <div className="grid gap-3 border-t pt-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="피드백 이유">
        {FEEDBACK_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tags.includes(t)}
            onClick={() => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              tags.includes(t) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="코멘트 / 추가 지시 (선택) — 추가 조사·수정 요청 시 다음 업무에 반영됩니다" className="min-h-14" maxLength={1000} />
      <div className="flex flex-wrap gap-2">
        {DECISIONS.map((d) => (
          <Button key={d.value} size="sm" variant={d.variant} disabled={pending} onClick={() => decide(d.value)}>
            {d.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
