import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "회원가입" };

export default function SignupPage() {
  return (
    <>
      <h2 className="mb-1 text-lg font-semibold">나만의 AI 회사 설립</h2>
      <p className="mb-4 text-sm text-muted-foreground">가입하면 샘플 데이터와 AI 직원 5명이 있는 회사가 바로 준비됩니다.</p>
      <AuthForm mode="signup" />
    </>
  );
}
