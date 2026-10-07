"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Input, Label } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/app/submit-button";
import { signIn, signUp, type AuthState } from "./actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});
  return (
    <form action={action} className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {mode === "signup" ? (
        <div className="grid gap-1.5">
          <Label htmlFor="displayName">이름 (선택)</Label>
          <Input id="displayName" name="displayName" placeholder="CEO 이름" autoComplete="name" />
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="email">이메일</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="ceo@example.com" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>
      {state.error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{state.error}</p> : null}
      {state.message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{state.message}</p> : null}
      <SubmitButton className="w-full" pendingText={mode === "login" ? "로그인 중…" : "가입 중…"}>
        {mode === "login" ? "출근하기 (로그인)" : "회사 설립하기 (회원가입)"}
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            아직 회사가 없나요?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              회원가입
            </Link>
          </>
        ) : (
          <>
            이미 계정이 있나요?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              로그인
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
