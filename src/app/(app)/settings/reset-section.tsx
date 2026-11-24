"use client";

import { useActionState, useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { AlertTriangleIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/app/submit-button";
import { resetCompanyAction, type SettingsState } from "./actions";

const WILL_BE_DELETED = [
  "AI 직원 전원 (고용 기록 · 직급 · 평가)",
  "업무, 리서치 결과, 출처, 트렌드, 사업 기회",
  "콘텐츠 아이디어와 성과, 회의록, 결재 내역, Daily Brief",
  "회사 기억(Company Memory), AI 비용 기록, 근무 설정, Notion 연결 정보",
];

/** 위험 구역 — 회사 초기화. 팝업 + 회사 이름 직접 입력 + 동의 체크 + 짧은 대기 후에만 실행된다 */
export function ResetCompanySection({ companyName }: { companyName: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [armed, setArmed] = useState(false);
  const [state, action] = useActionState<SettingsState, FormData>(resetCompanyAction, {});

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  // 팝업이 열릴 때마다 입력을 비우고, 실수로 바로 누르지 못하도록 3초 뒤에 버튼을 활성화한다
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setArmed(true), 3000);
    return () => clearTimeout(timer);
  }, [open]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    setTyped("");
    setAgreed(false);
    setArmed(false);
  }

  const nameMatches = typed.trim() === companyName;
  const canSubmit = nameMatches && agreed && armed;

  return (
    <section className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-5">
      <h2 className="flex items-center gap-2 font-semibold text-destructive">
        <AlertTriangleIcon className="size-4" aria-hidden />
        위험 구역
      </h2>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          현재 회사(<strong className="text-foreground">{companyName}</strong>)의 모든 데이터를 삭제하고 처음부터 새 회사를 세웁니다. 로그인 계정은 유지됩니다.
        </p>
        <Button type="button" variant="destructive" onClick={() => onOpenChange(true)}>
          회사 초기화…
        </Button>
      </div>

      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[oklch(0.3_0.03_40/0.45)] backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-3xl border-2 border-destructive bg-background p-6 shadow-xl outline-none">
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-destructive">
                <AlertTriangleIcon className="size-5" aria-hidden />
                정말 회사를 초기화할까요?
              </Dialog.Title>
              <Dialog.Close className="rounded-full p-1.5 opacity-70 hover:bg-accent hover:opacity-100" aria-label="닫기">
                <XIcon className="size-4" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-muted-foreground">
              이 작업은 <strong className="text-destructive">되돌릴 수 없습니다.</strong> 아래 데이터가 영구 삭제되고, 초기화 후 온보딩 화면에서 새 회사를 만들게 됩니다.
            </Dialog.Description>

            <ul className="list-disc space-y-1 rounded-lg bg-destructive/10 py-3 pl-8 pr-3 text-sm">
              {WILL_BE_DELETED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">이미 Notion 에 동기화된 페이지는 삭제되지 않습니다. 필요하면 Notion 에서 직접 정리하세요.</p>

            <form action={action} className="grid gap-4">
              <label className="grid gap-1.5 text-sm">
                <span>
                  확인을 위해 회사 이름 <strong className="font-mono">{companyName}</strong> 을(를) 그대로 입력하세요.
                </span>
                <Input
                  name="confirm_name"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  placeholder={companyName}
                  aria-invalid={typed.length > 0 && !nameMatches}
                />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="acknowledge" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4" />
                위 데이터가 모두 영구 삭제되며 복구할 수 없다는 것을 이해했습니다.
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  취소
                </Button>
                <SubmitButton variant="destructive" disabled={!canSubmit} pendingText="초기화 중…">
                  {armed ? "영구 삭제하고 초기화" : "잠시 기다려 주세요…"}
                </SubmitButton>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
