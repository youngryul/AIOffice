"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2Icon, Loader2Icon, PlayIcon, SquareIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_LABELS } from "@/lib/labels";
import { WORKFLOW_STAGES, type WorkflowStage } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

export interface RunSnapshot {
  id: string;
  stage: string;
  status: string;
  error: string | null;
  stage_log: unknown;
}

interface StageLog {
  stage: WorkflowStage;
  status: "completed" | "failed";
  logs: string[];
  error?: string;
}

const VISIBLE_STAGES = WORKFLOW_STAGES.filter((s) => s !== "done");

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `요청 실패 (${res.status})`);
  return json;
}

/**
 * FAST MODE 실행기: 시작 → 단계별 advance 반복 → 완료.
 * 각 단계가 끝날 때마다 화면(서버 컴포넌트)을 새로고침해 결과가 바로 보이게 한다.
 */
export function WorkdayRunner({ initialRun, aiReady, compact = false }: { initialRun: RunSnapshot | null; aiReady: boolean; compact?: boolean }) {
  const router = useRouter();
  const [run, setRun] = useState<RunSnapshot | null>(initialRun);
  const [busy, setBusy] = useState(false);
  const stopRef = useRef(false);

  const drive = useCallback(
    async (start: RunSnapshot) => {
      setBusy(true);
      stopRef.current = false;
      let current = start;
      let idleRounds = 0;
      try {
        while (current.status === "running" && !stopRef.current) {
          const res = await post<{ run: RunSnapshot; advanced: boolean }>("/api/workday/advance", { runId: current.id });
          current = res.run;
          setRun(current);
          router.refresh();
          if (!res.advanced) {
            // 다른 요청(크론 등)이 진행 중이거나 재시도 대기 → 잠시 후 다시
            idleRounds++;
            if (idleRounds > 60) break;
            await new Promise((r) => setTimeout(r, 5000));
          } else idleRounds = 0;
        }
        if (current.status === "completed") toast.success("오늘 업무가 끝났습니다. CEO Brief 와 결재 안건을 확인하세요!");
        if (current.status === "failed") toast.error(`업무 사이클 실패: ${current.error ?? "알 수 없는 오류"}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  // 페이지를 열었을 때 진행 중인 Run 이 있으면 이어서 진행
  useEffect(() => {
    const timer = initialRun?.status === "running" ? setTimeout(() => void drive(initialRun), 0) : null;
    return () => {
      if (timer) clearTimeout(timer);
      stopRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    try {
      const { run: started } = await post<{ run: RunSnapshot }>("/api/workday/start");
      setRun(started);
      toast("☀️ 출근! Morning Meeting 을 시작합니다.");
      await drive(started);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function cancel() {
    if (!run) return;
    stopRef.current = true;
    await post("/api/workday/cancel", { runId: run.id }).catch(() => null);
    setRun({ ...run, status: "cancelled" });
    router.refresh();
  }

  const running = run?.status === "running";
  const logs = ((run?.stage_log as StageLog[] | null) ?? []).filter(Boolean);
  const currentIdx = run ? WORKFLOW_STAGES.indexOf(run.stage as WorkflowStage) : -1;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <>
            <Button disabled>
              <Loader2Icon className="animate-spin" /> {STAGE_LABELS[run.stage as WorkflowStage] ?? run.stage} 진행 중…
            </Button>
            {!busy ? (
              <Button variant="outline" onClick={() => drive(run)}>
                이어서 진행
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={cancel}>
              <SquareIcon /> 중단
            </Button>
          </>
        ) : (
          <Button onClick={start} disabled={!aiReady || busy} title={aiReady ? undefined : "OPENAI_API_KEY 설정 필요"}>
            <PlayIcon /> 오늘 업무 실행 (FAST MODE)
          </Button>
        )}
        {run && !running ? (
          <span className="text-xs text-muted-foreground">
            최근 사이클: {run.status === "completed" ? "✅ 완료" : run.status === "failed" ? "❌ 실패" : "⏹ 중단"}
          </span>
        ) : null}
      </div>

      {run && !compact ? (
        <ol className="grid gap-1.5 sm:grid-cols-7" aria-label="업무 사이클 진행 단계">
          {VISIBLE_STAGES.map((s, i) => {
            const log = [...logs].reverse().find((l) => l.stage === s);
            const done = run.status === "completed" || i < currentIdx;
            const active = running && i === currentIdx;
            const failed = !running && run.status === "failed" && i === currentIdx;
            return (
              <li
                key={s}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-xs",
                  done && "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50",
                  active && "border-primary bg-accent",
                  failed && "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/50",
                )}
                title={log?.logs.join("\n") || log?.error}
              >
                <div className="flex items-center gap-1 font-medium">
                  {done ? <CheckCircle2Icon className="size-3.5 text-emerald-600" /> : active ? <Loader2Icon className="size-3.5 animate-spin" /> : failed ? <XCircleIcon className="size-3.5 text-rose-600" /> : <span className="size-3.5 rounded-full border" />}
                  {STAGE_LABELS[s]}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {run && !compact && logs.length ? (
        <details className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium">업무 로그 ({logs.length})</summary>
          <ul className="mt-2 grid gap-1">
            {logs.map((l, i) => (
              <li key={i}>
                <b>{STAGE_LABELS[l.stage] ?? l.stage}</b> {l.status === "failed" ? `❌ ${l.error}` : ""}
                {l.logs.map((m, j) => (
                  <div key={j} className="pl-3 text-muted-foreground">
                    {m}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {run?.status === "failed" && run.error ? <p className="text-xs text-rose-600">오류: {run.error}</p> : null}
    </div>
  );
}
