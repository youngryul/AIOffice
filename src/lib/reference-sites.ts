/** 참고 사이트 — CEO 가 운영하는 웹사이트. 서버/클라이언트 공용 (server-only 아님) */
export interface ReferenceSite {
  url: string;
  label: string;
}

export const MAX_REFERENCE_SITES = 10;

/** http(s) 주소만 허용. 스킴이 없으면 https 로 보정하고, 해시/쿼리를 제거해 정규화한다. 잘못된 주소는 null */
export function normalizeSiteUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    u.hash = "";
    u.search = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** jsonb 컬럼 값을 안전하게 ReferenceSite[] 로 변환 (형식이 깨진 항목은 버린다) */
export function parseReferenceSites(value: unknown): ReferenceSite[] {
  if (!Array.isArray(value)) return [];
  const out: ReferenceSite[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { url, label } = item as Record<string, unknown>;
    const normalized = typeof url === "string" ? normalizeSiteUrl(url) : null;
    if (!normalized) continue;
    out.push({ url: normalized, label: typeof label === "string" ? label.trim().slice(0, 60) : "" });
  }
  return out.slice(0, MAX_REFERENCE_SITES);
}

export function siteHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
