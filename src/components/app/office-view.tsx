"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScoreBar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { EMPLOYEE_STATUS_META } from "@/lib/labels";
import type { Department, EmployeeStatus } from "@/lib/types/domain";
import { cn, formatDateTime, formatUsd } from "@/lib/utils";

export interface OfficeEmployee {
  id: string;
  name: string;
  avatar: string;
  roleTitle: string;
  department: Department;
  positionLabel: string;
  status: EmployeeStatus;
  currentTask: string | null;
  recentWork: { title: string; status: string; at: string }[];
  performance: { accuracy: number; approvalRate: number; overall: number };
  usage: { costToday: number; tokensToday: number; dailyBudget: number };
}

const ROOMS: { key: Department | "meeting"; label: string; tone: string }[] = [
  { key: "executive", label: "CEO ROOM", tone: "from-violet-100/80 dark:from-violet-950/40" },
  { key: "meeting", label: "회의실", tone: "from-amber-100/80 dark:from-amber-950/40" },
  { key: "research", label: "Research Team", tone: "from-sky-100/80 dark:from-sky-950/40" },
  { key: "content", label: "Content Team", tone: "from-pink-100/80 dark:from-pink-950/40" },
  { key: "strategy", label: "Strategy Team", tone: "from-emerald-100/80 dark:from-emerald-950/40" },
  { key: "quality", label: "Quality Team", tone: "from-zinc-100/80 dark:from-zinc-800/40" },
];

const ANIMATION: Record<EmployeeStatus, string> = {
  working: "animate-typing",
  researching: "animate-bob",
  writing: "animate-typing",
  meeting: "animate-blink",
  approving: "animate-bob",
  break: "",
  offline: "grayscale opacity-50",
};

/**
 * 작은 사무실 Office View. 캐릭터는 지금은 Emoji 아바타이며,
 * EmployeeAvatar 컴포넌트만 바꾸면 이미지 아바타로 교체할 수 있다.
 */
export function EmployeeAvatar({ avatar, status, size = "md" }: { avatar: string; status: EmployeeStatus; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border",
        size === "lg" ? "size-16 text-4xl" : "size-12 text-2xl",
        ANIMATION[status],
      )}
      aria-hidden
    >
      {avatar}
    </span>
  );
}

export function OfficeView({ employees: initial, live }: { employees: OfficeEmployee[]; live: boolean }) {
  // 폴링으로 받은 최신 상태를 서버에서 받은 목록 위에 덮어쓴다
  const [overrides, setOverrides] = useState<Record<string, Pick<OfficeEmployee, "status" | "currentTask">>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const employees = initial.map((e) => ({ ...e, ...overrides[e.id] }));
  const selected = employees.find((e) => e.id === selectedId) ?? null;

  // 업무 사이클이 진행 중이면 직원 상태를 주기적으로 갱신
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(async () => {
      const res = await fetch("/api/workday/status").catch(() => null);
      if (!res?.ok) return;
      const json = (await res.json()) as { employees: { id: string; status: EmployeeStatus; tasks: { title: string } | null }[] };
      setOverrides(Object.fromEntries(json.employees.map((x) => [x.id, { status: x.status, currentTask: x.tasks?.title ?? null }])));
    }, 4000);
    return () => clearInterval(timer);
  }, [live]);

  const roomOf = (e: OfficeEmployee): Department | "meeting" => (e.status === "meeting" ? "meeting" : e.department);
  const rooms = ROOMS.filter((r) => r.key === "meeting" || r.key === "executive" || employees.some((e) => e.department === r.key));

  return (
    <>
      <div className="grid gap-3 rounded-2xl border bg-[var(--office-floor)] bg-[linear-gradient(var(--office-tile)_1px,transparent_1px),linear-gradient(90deg,var(--office-tile)_1px,transparent_1px)] bg-[size:24px_24px] p-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => {
          const people = employees.filter((e) => roomOf(e) === room.key);
          return (
            <section key={room.key} className={cn("min-h-36 rounded-xl border bg-gradient-to-b to-card/90 p-3", room.tone)} aria-label={room.label}>
              <h3 className="mb-2 flex items-center justify-between text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {room.label}
                {room.key === "meeting" && people.length ? <span className="normal-case">💬 회의 진행 중</span> : null}
              </h3>
              <div className="flex flex-wrap gap-3">
                {room.key === "executive" ? (
                  <div className="flex w-20 flex-col items-center gap-1 text-center">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl ring-1 ring-primary/30" aria-hidden>
                      👑
                    </span>
                    <span className="text-xs font-medium">CEO (나)</span>
                  </div>
                ) : null}
                {people.map((e) => {
                  const meta = EMPLOYEE_STATUS_META[e.status];
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedId(e.id)}
                      className="group flex w-20 flex-col items-center gap-1 rounded-xl p-1 text-center outline-none hover:bg-card/60 focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`${e.name} — ${meta.label}`}
                    >
                      <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] whitespace-nowrap shadow-sm ring-1 ring-border">
                        {meta.emoji} {meta.label}
                      </span>
                      <EmployeeAvatar avatar={e.avatar} status={e.status} />
                      <span className="w-full truncate text-xs font-medium">{e.name}</span>
                    </button>
                  );
                })}
                {!people.length && room.key !== "executive" ? <p className="text-xs text-muted-foreground">비어 있음</p> : null}
              </div>
            </section>
          );
        })}
      </div>

      <Sheet open={selected !== null} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected ? (
          <SheetContent title={selected.name}>
            <div className="flex items-center gap-3">
              <EmployeeAvatar avatar={selected.avatar} status={selected.status} size="lg" />
              <div className="grid gap-1">
                <p className="text-sm font-medium">{selected.roleTitle}</p>
                <div className="flex gap-1.5">
                  <Badge variant="outline">{selected.positionLabel}</Badge>
                  <span className={cn("rounded-md px-2 py-0.5 text-xs", EMPLOYEE_STATUS_META[selected.status].tone)}>
                    {EMPLOYEE_STATUS_META[selected.status].emoji} {EMPLOYEE_STATUS_META[selected.status].label}
                  </span>
                </div>
              </div>
            </div>
            <section className="grid gap-1">
              <h4 className="text-xs font-semibold text-muted-foreground">현재 업무</h4>
              <p className="text-sm">{selected.currentTask ?? "대기 중"}</p>
            </section>
            <section className="grid gap-2">
              <h4 className="text-xs font-semibold text-muted-foreground">성과</h4>
              {(
                [
                  ["정확도", selected.performance.accuracy],
                  ["CEO 승인율", selected.performance.approvalRate],
                  ["종합", selected.performance.overall],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="grid gap-1">
                  <div className="flex justify-between text-xs">
                    <span>{label}</span>
                    <span className="tabular-nums">{Math.round(v)}</span>
                  </div>
                  <ScoreBar value={v} />
                </div>
              ))}
            </section>
            <section className="grid gap-1">
              <h4 className="text-xs font-semibold text-muted-foreground">오늘 토큰 사용량</h4>
              <p className="text-sm tabular-nums">
                {selected.usage.tokensToday.toLocaleString()} tokens · {formatUsd(selected.usage.costToday, 4)} / 예산 {formatUsd(selected.usage.dailyBudget)}
              </p>
              <ScoreBar value={selected.usage.costToday} max={Math.max(selected.usage.dailyBudget, 0.0001)} />
            </section>
            <section className="grid gap-1">
              <h4 className="text-xs font-semibold text-muted-foreground">최근 업무</h4>
              {selected.recentWork.length ? (
                <ul className="grid gap-1.5">
                  {selected.recentWork.map((w, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-sm">
                      <span className="line-clamp-2">{w.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {w.status} · {formatDateTime(w.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">아직 업무 기록이 없습니다.</p>
              )}
            </section>
            <Link href={`/employees/${selected.id}`} className="mt-auto text-sm font-medium text-primary hover:underline">
              직원 상세 / 설정 →
            </Link>
          </SheetContent>
        ) : null}
      </Sheet>
    </>
  );
}
