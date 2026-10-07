import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(value: number | string | null | undefined, digits = 2): string {
  const n = Number(value ?? 0);
  return `$${n.toFixed(n > 0 && n < 0.01 ? 4 : digits)}`;
}

export function formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", opts).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  return formatDate(value, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
