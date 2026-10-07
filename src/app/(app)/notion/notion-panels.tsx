"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/app/submit-button";
import {
  backfill,
  connectWithToken,
  retryFailed,
  selectParentPage,
  setupWorkspace,
  syncNow,
  toggleAutoSync,
  type NotionActionState,
} from "./actions";

function useResultToast(state: NotionActionState) {
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.message) toast.success(state.message);
  }, [state]);
}

export function TokenConnectForm({ envTokenAvailable }: { envTokenAvailable: boolean }) {
  const [state, action] = useActionState<NotionActionState, FormData>(connectWithToken, {});
  useResultToast(state);
  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-3">
        <Field label="Internal Integration Token" hint="notion.so/profile/integrations 에서 만든 Integration 의 Secret (ntn_...)">
          <Input name="token" type="password" autoComplete="off" placeholder="ntn_..." />
        </Field>
        <Field label="상위 페이지 URL 또는 ID" hint="이 페이지 아래에 'AI OFFICE' 가 생성됩니다. 페이지의 ••• → Connections 에서 Integration 을 추가해 두세요.">
          <Input name="parent" placeholder="https://www.notion.so/My-Page-1234abcd..." />
        </Field>
        <SubmitButton pendingText="연결 중…" className="w-fit">
          토큰으로 연결
        </SubmitButton>
      </form>
      {envTokenAvailable ? (
        <form action={action} className="rounded-lg border border-dashed p-3">
          <input type="hidden" name="use_env" value="1" />
          <p className="mb-2 text-sm text-muted-foreground">서버 환경변수 NOTION_TOKEN / NOTION_PARENT_PAGE_ID 가 설정되어 있습니다.</p>
          <SubmitButton variant="outline" size="sm" pendingText="연결 중…">
            환경변수 토큰으로 연결
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

export function ParentPagePicker({ pages }: { pages: { id: string; title: string }[] }) {
  const [state, action] = useActionState<NotionActionState, FormData>(selectParentPage, {});
  useResultToast(state);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Field label="AI OFFICE 를 만들 상위 페이지" className="min-w-64 flex-1">
        <NativeSelect name="page_id" required defaultValue="">
          <option value="" disabled>
            {pages.length ? "페이지 선택" : "접근 가능한 페이지가 없습니다 — Notion 에서 페이지를 공유하세요"}
          </option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <SubmitButton pendingText="생성 중…">워크스페이스 만들기</SubmitButton>
    </form>
  );
}

export function QueueActions({ autoSync }: { autoSync: boolean }) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<NotionActionState>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      if (res.message) toast.success(res.message);
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => run(syncNow)}>
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        지금 동기화
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(retryFailed)}>
        실패 작업 재시도
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(backfill)}>
        최근 30일 데이터 전체 동기화
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(setupWorkspace)}>
        워크스페이스 점검
      </Button>
      <label className="ml-auto flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          defaultChecked={autoSync}
          onChange={(e) => {
            const checked = e.target.checked;
            startTransition(() => toggleAutoSync(checked));
          }}
        />
        AI 결과 자동 동기화
      </label>
    </div>
  );
}
