"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScoreBar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { EMPLOYEE_STATUS_META } from "@/lib/labels";
import type { Department, EmployeeStatus } from "@/lib/types/domain";
import { cn, formatDateTime, formatUsd } from "@/lib/utils";
import { CritterAvatar } from "@/components/app/critter";

export interface OfficeEmployee {
  id: string;
  name: string;
  avatar: string;
  role: string;
  roleTitle: string;
  department: Department;
  positionLabel: string;
  status: EmployeeStatus;
  currentTask: string | null;
  recentWork: { title: string; status: string; at: string }[];
  performance: { accuracy: number; approvalRate: number; overall: number };
  usage: { costToday: number; tokensToday: number; dailyBudget: number };
}

const ROOMS: { key: Department | "meeting"; label: string; deco: string; tone: string }[] = [
  { key: "executive", label: "CEO실", deco: "👑", tone: "bg-[oklch(0.96_0.03_300)] dark:bg-[oklch(0.27_0.04_300)]" },
  { key: "meeting", label: "회의실", deco: "☕", tone: "bg-[oklch(0.97_0.04_85)] dark:bg-[oklch(0.27_0.04_70)]" },
  { key: "research", label: "리서치팀", deco: "🔭", tone: "bg-[oklch(0.96_0.03_230)] dark:bg-[oklch(0.27_0.04_240)]" },
  { key: "content", label: "콘텐츠팀", deco: "🌷", tone: "bg-[oklch(0.96_0.03_10)] dark:bg-[oklch(0.27_0.04_10)]" },
  { key: "strategy", label: "전략팀", deco: "🪴", tone: "bg-[oklch(0.96_0.04_150)] dark:bg-[oklch(0.27_0.04_150)]" },
  { key: "quality", label: "품질팀", deco: "🔎", tone: "bg-[oklch(0.96_0.02_70)] dark:bg-[oklch(0.27_0.02_60)]" },
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
 * 작은 사무실 Office View. 직원은 역할별 말랑 동물 캐릭터(critter.tsx)로 표시되며,
 * 상태에 따라 표정과 움직임이 바뀐다.
 */
export function EmployeeAvatar({ avatar, role, status, size = "md" }: { avatar: string; role?: string; status: EmployeeStatus; size?: "md" | "lg" }) {
  return (
    <span className={cn("relative inline-flex flex-col items-center", ANIMATION[status])}>
      <CritterAvatar role={role} avatar={avatar} status={status} size={size === "lg" ? "lg" : "md"} />
      <span className="-mt-1 h-1.5 w-2/3 rounded-full bg-black/10" aria-hidden />
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
      <div className="grid gap-4 rounded-3xl border-2 border-border-strong bg-[var(--office-floor)] bg-[linear-gradient(var(--office-tile)_1px,transparent_1px),linear-gradient(90deg,var(--office-tile)_1px,transparent_1px)] bg-[size:28px_28px] p-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => {
          const people = employees.filter((e) => roomOf(e) === room.key);
          return (
            <section key={room.key} className={cn("relative min-h-40 rounded-2xl border-2 border-border-strong p-3 pt-5 shadow-[0_3px_0_var(--border-strong)]", room.tone)} aria-label={room.label}>
              <span className="pointer-events-none absolute right-3 bottom-2 text-xl opacity-70" aria-hidden>
                {room.deco}
              </span>
              <h3 className="absolute -top-3 left-3 flex items-center gap-2 rounded-full border-2 border-border-strong bg-card px-3 py-0.5 font-[family-name:var(--font-cute)] text-xs text-foreground">
                {room.label}
                {room.key === "meeting" && people.length ? <span className="text-primary">💬 회의 중</span> : null}
              </h3>
              <div className="mt-1 flex flex-wrap gap-2">
                {room.key === "executive" ? (
                  <div className="flex w-20 flex-col items-center gap-1 text-center">
                    <span className="flex size-14 items-center justify-center rounded-full border-2 border-border-strong bg-card text-3xl" aria-hidden>
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
                      className="group flex w-20 flex-col items-center gap-0.5 rounded-2xl p-1 text-center outline-none transition-transform hover:-translate-y-0.5 hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`${e.name} — ${meta.label}`}
                    >
                      <span className="rounded-full border-[1.5px] border-border-strong bg-card px-1.5 py-0.5 text-[10px] whitespace-nowrap">
                        {meta.emoji} {meta.label}
                      </span>
                      <EmployeeAvatar avatar={e.avatar} role={e.role} status={e.status} />
                      <span className="w-full truncate font-[family-name:var(--font-cute)] text-xs">{e.name}</span>
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
              <EmployeeAvatar avatar={selected.avatar} role={selected.role} status={selected.status} size="lg" />
              <div className="grid gap-1">
                <p className="text-sm font-medium">{selected.roleTitle}</p>
                <div className="flex gap-1.5">
                  <Badge variant="outline">{selected.positionLabel}</Badge>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", EMPLOYEE_STATUS_META[selected.status].tone)}>
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
