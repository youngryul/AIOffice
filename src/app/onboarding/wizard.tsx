"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/lib/types/domain";
import { completeOnboarding } from "./actions";

interface RoleOption {
  key: RoleKey;
  title: string;
  avatar: string;
  defaultName: string;
  description: string;
  mvpDefault: boolean;
}

const INTEREST_PRESETS = ["AI", "Coding", "Startup", "Content", "Productivity", "AI Agent", "바이브코딩", "SaaS"];
const BRAND_PRESETS = ["AI", "개발", "바이브코딩", "생산성", "AI Side Project", "AI 서비스 만들기"];
const STEPS = ["회사 이름", "관심 분야", "브랜드 주제", "근무시간", "AI 직원", "Notion", "시작"];

function ChipPicker({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState("");
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  const all = [...new Set([...options, ...value])];
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {all.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            aria-pressed={value.includes(o)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              value.includes(o) ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
            )}
          >
            {o}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = custom.trim();
          if (v && !value.includes(v)) onChange([...value, v]);
          setCustom("");
        }}
      >
        <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="직접 입력 후 Enter" maxLength={40} />
        <Button type="submit" variant="outline">
          추가
        </Button>
      </form>
    </div>
  );
}

export function OnboardingWizard({ roles }: { roles: RoleOption[] }) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [companyName, setCompanyName] = useState("");
  const [interests, setInterests] = useState<string[]>(["AI", "Coding", "Startup"]);
  const [brandTopics, setBrandTopics] = useState<string[]>(["AI", "바이브코딩", "AI 서비스 만들기"]);
  const [brandDirection, setBrandDirection] = useState("");
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>(roles.filter((r) => r.mvpDefault).map((r) => r.key));
  const [withDemo, setWithDemo] = useState(true);
  const [connectNotion, setConnectNotion] = useState(false);

  const canNext = [companyName.trim().length > 0, interests.length > 0, brandTopics.length > 0, workStart < workEnd, selectedRoles.length > 0, true, true][step];

  function finish() {
    startTransition(async () => {
      const res = await completeOnboarding(
        { companyName, interests, brandTopics, brandDirection, timezone, workStart, workEnd, roles: selectedRoles, withDemo },
        connectNotion,
      );
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-primary">AI Office 설립</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Step {step + 1}. {STEPS[step]}
        </h1>
      </div>
      <ol className="mb-6 flex items-center justify-center gap-1.5" aria-label="진행 단계">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("h-1.5 w-8 rounded-full", i <= step ? "bg-primary" : "bg-muted")} aria-current={i === step ? "step" : undefined}>
            <span className="sr-only">{s}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        {step === 0 && (
          <Field label="회사 이름" hint="AI 직원들이 소속될 회사의 이름입니다.">
            <Input autoFocus value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="예: Vibe Lab" maxLength={100} />
          </Field>
        )}
        {step === 1 && (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">AI 직원들이 매일 조사할 CEO 관심 분야를 고르세요.</p>
            <ChipPicker options={INTEREST_PRESETS} value={interests} onChange={setInterests} />
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">콘텐츠 기획자가 참고할 브랜드 주제입니다.</p>
            <ChipPicker options={BRAND_PRESETS} value={brandTopics} onChange={setBrandTopics} />
            <Field label="브랜드 방향 (선택)">
              <Textarea value={brandDirection} onChange={(e) => setBrandDirection(e.target.value)} placeholder="예: 직접 써보고 검증한 AI 개발 도구만 소개하는 실전형 개발자" maxLength={500} />
            </Field>
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="출근">
              <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
            </Field>
            <Field label="퇴근">
              <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
            </Field>
            <Field label="타임존">
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </Field>
            <p className="text-sm text-muted-foreground sm:col-span-3">
              처음에는 <b>FAST MODE</b> 로 시작합니다. 버튼 하나로 하루 업무를 몇 분 안에 시뮬레이션하고, 설정에서 REAL MODE(실제 근무시간)로 바꿀 수 있습니다.
            </p>
          </div>
        )}
        {step === 4 && (
          <div className="grid gap-2">
            <p className="mb-1 text-sm text-muted-foreground">채용할 AI 직원을 선택하세요. 비서실장은 항상 포함됩니다.</p>
            {roles.map((r) => {
              const locked = r.key === "chief_of_staff";
              const checked = locked || selectedRoles.includes(r.key);
              return (
                <label key={r.key} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors", checked ? "border-primary bg-accent/50" : "hover:bg-accent/30")}>
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={checked}
                    disabled={locked}
                    onChange={() => setSelectedRoles((prev) => (prev.includes(r.key) ? prev.filter((k) => k !== r.key) : [...prev, r.key]))}
                  />
                  <span className="text-2xl" aria-hidden>
                    {r.avatar}
                  </span>
                  <span className="grid">
                    <span className="text-sm font-medium">
                      {r.defaultName} · {r.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{r.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {step === 5 && (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              AI 직원들의 결과물은 앱 DB 에 먼저 저장되고, Notion 에도 자동으로 정리됩니다. 연결은 언제든 Notion 메뉴에서 할 수 있습니다.
            </p>
            <label className="flex items-center gap-3 rounded-xl border p-3">
              <input type="checkbox" className="size-4" checked={connectNotion} onChange={(e) => setConnectNotion(e.target.checked)} />
              <span className="text-sm">설립 직후 Notion 연결 화면으로 이동</span>
            </label>
          </div>
        )}
        {step === 6 && (
          <div className="grid gap-4">
            <ul className="grid gap-1 text-sm">
              <li>🏢 회사: <b>{companyName}</b></li>
              <li>🔭 관심 분야: {interests.join(", ")}</li>
              <li>🎯 브랜드 주제: {brandTopics.join(", ")}</li>
              <li>⏰ 근무시간: {workStart} ~ {workEnd} ({timezone})</li>
              <li>🧑‍💼 직원: {new Set(["chief_of_staff", ...selectedRoles]).size}명</li>
            </ul>
            <label className="flex items-center gap-3 rounded-xl border p-3">
              <input type="checkbox" className="size-4" checked={withDemo} onChange={(e) => setWithDemo(e.target.checked)} />
              <span className="text-sm">샘플 데이터로 바로 체험하기 (Demo Mode — [샘플] 표시)</span>
            </label>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
          이전
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            다음
          </Button>
        ) : (
          <Button onClick={finish} disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            AI Office 시작
          </Button>
        )}
      </div>
    </div>
  );
}
