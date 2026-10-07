import type { Metadata } from "next";

export const metadata: Metadata = { title: "설정 필요" };
export const dynamic = "force-dynamic";

const REQUIRED = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase 프로젝트 URL"],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Supabase publishable(anon) key"],
  ["SUPABASE_SECRET_KEY", "Supabase secret(service_role) key — 서버 전용"],
] as const;

/** 필수 환경변수가 없을 때 proxy 가 이 페이지로 보낸다 (첫 실행 안내) */
export default function SetupPage() {
  const has = (k: string) => Boolean(process.env[k] || (k.includes("PUBLISHABLE") && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || (k === "SUPABASE_SECRET_KEY" && process.env.SUPABASE_SERVICE_ROLE_KEY));
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <div>
        <p className="text-4xl" aria-hidden>
          🛠️
        </p>
        <h1 className="mt-2 text-2xl font-bold">AI Office 설정이 필요합니다</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <code>.env.example</code> 을 <code>.env.local</code> 로 복사하고 아래 값을 채운 뒤 서버를 재시작하세요. 자세한 내용은 README 의 &ldquo;Supabase 설정&rdquo; 을 참고하세요.
        </p>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {REQUIRED.map(([key, desc]) => (
          <li key={key} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <code className="font-semibold">{key}</code>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <span className={has(key) ? "text-emerald-600" : "text-rose-600"}>{has(key) ? "✓ 설정됨" : "✗ 없음"}</span>
          </li>
        ))}
      </ul>
      <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-xs">
        {`# 로컬 Supabase 를 쓰는 경우
npx supabase start
# 출력된 API URL / Publishable key / Secret key 를 .env.local 에 입력
npm run dev`}
      </pre>
    </main>
  );
}
