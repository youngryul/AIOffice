/**
 * 중복 뉴스 제거 (순수 함수 — 단위 테스트 대상).
 * 1) URL 정규화 일치  2) 제목 유사도  3) 의미 유사도(embedding, 선택)
 */

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|ref$|ref_src$|mc_cid$|mc_eid$|igshid$|si$)/i;

export function normalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  let path = url.pathname.replace(/\/+$/, "");
  if (path === "") path = "/";
  const query = url.searchParams.toString();
  return `https://${url.hostname}${path}${query ? `?${query}` : ""}`;
}

export function isSafeHttpUrl(raw: string): boolean {
  return normalizeUrl(raw) !== null;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function bigrams(text: string): Set<string> {
  const s = text.toLowerCase().replace(/\s+/g, " ").trim();
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

/** 제목 유사도 0~1: 토큰 Jaccard 와 문자 bigram Dice 중 큰 값 (한국어/영어 혼용 대응) */
export function titleSimilarity(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  const jaccard = union === 0 ? 0 : inter / union;

  const ba = bigrams(a);
  const bb = bigrams(b);
  let binter = 0;
  for (const g of ba) if (bb.has(g)) binter++;
  const dice = ba.size + bb.size === 0 ? 0 : (2 * binter) / (ba.size + bb.size);
  return Math.max(jaccard, dice);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface DedupeItem {
  title: string;
  urls: string[];
  embedding?: number[];
}

export const TITLE_SIMILARITY_THRESHOLD = 0.72;
export const SEMANTIC_SIMILARITY_THRESHOLD = 0.88;

/**
 * 같은 이슈를 묶는다. 반환값: 각 item 의 대표(group leader) index.
 * groups[i] === i 이면 i 가 대표, 아니면 groups[i] 와 중복.
 */
export function groupDuplicates(items: DedupeItem[]): number[] {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };

  const normalized = items.map((it) => new Set(it.urls.map(normalizeUrl).filter((u): u is string => Boolean(u))));

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const sharesUrl = [...normalized[i]].some((u) => normalized[j].has(u));
      const similarTitle = titleSimilarity(items[i].title, items[j].title) >= TITLE_SIMILARITY_THRESHOLD;
      const ei = items[i].embedding;
      const ej = items[j].embedding;
      const similarMeaning = Boolean(ei && ej && cosineSimilarity(ei, ej) >= SEMANTIC_SIMILARITY_THRESHOLD);
      if (sharesUrl || similarTitle || similarMeaning) union(i, j);
    }
  }
  return items.map((_, i) => find(i));
}
