export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,var(--accent),transparent_60%)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-card text-3xl shadow-sm ring-1 ring-border" aria-hidden>
            🏢
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Office</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI 직원들이 조사하고, 토론하고, 결재를 올립니다.</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
