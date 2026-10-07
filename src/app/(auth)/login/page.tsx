import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">CEO 로그인</h2>
      {error ? <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">인증에 실패했습니다. 다시 시도하세요.</p> : null}
      <AuthForm mode="login" next={next} />
    </>
  );
}
