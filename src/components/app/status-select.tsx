"use client";

import { useTransition } from "react";
import { NativeSelect } from "@/components/ui/form-controls";

/** 선택 즉시 Server Action 으로 상태를 바꾸는 select */
export function StatusSelect({
  action,
  value,
  options,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  value: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <NativeSelect
      aria-label={label}
      className="h-8 w-auto text-xs"
      defaultValue={value}
      disabled={pending}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("status", e.target.value);
        startTransition(() => action(fd));
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}
