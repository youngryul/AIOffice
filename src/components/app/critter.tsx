import { ROLE_CATALOG } from "@/lib/agents/roles";
import { AVATAR_IMAGES } from "@/lib/avatar-images";
import type { EmployeeStatus, RoleKey } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

/**
 * 손그림 느낌의 동글동글 "말랑 동물" 직원 캐릭터 (오리지널 디자인, 인라인 SVG).
 * - 굵은 갈색 외곽선 + 찹쌀떡 몸통 + 빗금 볼터치 + 반짝이는 점눈
 * - 역할(Role)마다 동물이 다르고, 상태(EmployeeStatus)에 따라 표정이 바뀐다.
 */

const INK = "#3b2f2c";
const SW = 3.2;

type Mood = "happy" | "focus" | "talk" | "sleep" | "sweat";

const MOOD_BY_STATUS: Record<EmployeeStatus, Mood> = {
  working: "focus",
  researching: "focus",
  writing: "focus",
  meeting: "talk",
  approving: "sweat",
  break: "happy",
  offline: "sleep",
};

interface CritterDef {
  species: string;
  body: string;
  /** 몸통 뒤에 그려지는 요소 (귀, 꼬리, 가시, 털뭉치) */
  back?: React.ReactNode;
  /** 몸통 위, 얼굴 아래 (무늬) */
  pattern?: React.ReactNode;
  /** 얼굴 위에 덧그리는 소품 (안경, 헤드폰, 넥타이…) */
  front?: React.ReactNode;
  /** 눈 위치 보정 */
  eyeY?: number;
  /** 입 대신 부리 등을 쓰는 경우 */
  beak?: string;
}

const line = { stroke: INK, strokeWidth: SW, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** 찹쌀떡 몸통 (작은 발 포함) */
const BODY_PATH =
  "M50 16 C74 16 88 33 88 55 C88 72 79 84 66 87 C64 91 60 92 57 88 C53 89 47 89 43 88 C40 92 36 91 34 87 C21 84 12 72 12 55 C12 33 26 16 50 16 Z";

export const CRITTERS: Record<RoleKey, CritterDef> = {
  // 🐧 비서실장 — 나비넥타이 맨 펭귄
  chief_of_staff: {
    species: "펭귄",
    body: "#fdfcf8",
    pattern: <path d="M50 16 C74 16 88 33 88 52 C80 40 66 36 50 44 C34 36 20 40 12 52 C12 33 26 16 50 16 Z" fill="#5b6f8f" {...line} />,
    front: (
      <>
        <path d="M50 80 L41 75 L41 85 Z M50 80 L59 75 L59 85 Z" fill="#7d93c4" {...line} strokeWidth={2.2} />
        <circle cx="50" cy="80" r="2.4" fill="#7d93c4" {...line} strokeWidth={2} />
        <path d="M14 58 C8 62 7 70 11 73" fill="none" {...line} />
        <path d="M86 58 C92 62 93 70 89 73" fill="none" {...line} />
      </>
    ),
    beak: "#f5b25b",
  },
  // 🦉 AI 트렌드 리서처 — 동그란 안경 부엉이
  ai_trend_researcher: {
    species: "부엉이",
    body: "#e7defa",
    back: (
      <>
        <path d="M22 30 L18 10 L36 22 Z" fill="#cbbcef" {...line} />
        <path d="M78 30 L82 10 L64 22 Z" fill="#cbbcef" {...line} />
      </>
    ),
    pattern: <path d="M38 74 Q44 70 50 74 Q56 70 62 74" fill="none" {...line} strokeWidth={2.2} opacity={0.55} />,
    front: (
      <>
        <circle cx="38" cy="52" r="9" fill="none" {...line} strokeWidth={2.6} />
        <circle cx="62" cy="52" r="9" fill="none" {...line} strokeWidth={2.6} />
        <path d="M47 51 Q50 49 53 51" fill="none" {...line} strokeWidth={2.4} />
      </>
    ),
    beak: "#f2b45c",
  },
  // 🐸 바이브코딩 리서처 — 헤드폰 쓴 개구리
  vibe_coding_researcher: {
    species: "개구리",
    body: "#cdeccf",
    back: (
      <>
        <circle cx="32" cy="22" r="11" fill="#cdeccf" {...line} />
        <circle cx="68" cy="22" r="11" fill="#cdeccf" {...line} />
      </>
    ),
    front: (
      <>
        <path d="M18 46 C18 22 82 22 82 46" fill="none" stroke="#6b8fd6" strokeWidth={5} strokeLinecap="round" />
        <rect x="9" y="42" width="12" height="18" rx="6" fill="#8fb0ee" {...line} />
        <rect x="79" y="42" width="12" height="18" rx="6" fill="#8fb0ee" {...line} />
      </>
    ),
  },
  // 🦝 시장조사 분석가 — 너구리
  market_researcher: {
    species: "너구리",
    body: "#d9d6d2",
    back: (
      <>
        <circle cx="25" cy="24" r="9" fill="#9e968f" {...line} />
        <circle cx="75" cy="24" r="9" fill="#9e968f" {...line} />
      </>
    ),
    pattern: (
      <>
        <path d="M20 52 C24 42 36 42 44 50 C40 60 28 62 20 52 Z" fill="#8a827c" opacity={0.85} />
        <path d="M80 52 C76 42 64 42 56 50 C60 60 72 62 80 52 Z" fill="#8a827c" opacity={0.85} />
        <ellipse cx="38" cy="52" rx="6.5" ry="6.5" fill="#f4f1ec" />
        <ellipse cx="62" cy="52" rx="6.5" ry="6.5" fill="#f4f1ec" />
      </>
    ),
  },
  // 🐕 사업기회 분석가 — 시바 강아지
  business_analyst: {
    species: "시바견",
    body: "#f6c99a",
    back: (
      <>
        <path d="M20 34 L22 12 L40 22 Z" fill="#eaa76c" {...line} />
        <path d="M80 34 L78 12 L60 22 Z" fill="#eaa76c" {...line} />
      </>
    ),
    pattern: <path d="M28 64 C28 54 40 52 50 58 C60 52 72 54 72 64 C72 78 60 84 50 84 C40 84 28 78 28 64 Z" fill="#fff6ea" />,
    front: <path d="M46 84 L54 84 L56 90 L44 90 Z" fill="#6d93c9" {...line} strokeWidth={2.2} />,
  },
  // 🐑 브랜드 전략가 — 몽글몽글 양
  brand_strategist: {
    species: "양",
    body: "#fdf5ec",
    back: (
      <>
        <ellipse cx="14" cy="44" rx="8" ry="5" fill="#d9c3b0" {...line} transform="rotate(-25 14 44)" />
        <ellipse cx="86" cy="44" rx="8" ry="5" fill="#d9c3b0" {...line} transform="rotate(25 86 44)" />
      </>
    ),
    front: (
      <path
        d="M26 34 C22 24 32 16 40 20 C44 12 56 12 60 20 C68 16 78 24 74 34 C70 30 64 32 62 34 C58 28 52 28 50 32 C48 28 42 28 38 34 C36 32 30 30 26 34 Z"
        fill="#ffffff"
        {...line}
      />
    ),
  },
  // 🐥 콘텐츠 기획자 — 새싹 병아리
  content_strategist: {
    species: "병아리",
    body: "#fdeaa0",
    back: (
      <>
        <path d="M50 16 C50 10 50 8 50 6" fill="none" {...line} />
        <path d="M50 8 C42 2 36 6 38 10 C42 12 48 10 50 8 Z" fill="#9cd38f" {...line} strokeWidth={2.4} />
        <path d="M50 8 C58 2 64 6 62 10 C58 12 52 10 50 8 Z" fill="#9cd38f" {...line} strokeWidth={2.4} />
      </>
    ),
    front: (
      <>
        <path d="M14 60 C6 60 6 70 13 72" fill="#fdeaa0" {...line} />
        <path d="M86 60 C94 60 94 70 87 72" fill="#fdeaa0" {...line} />
      </>
    ),
    beak: "#f4a457",
  },
  // 🦔 팩트체커 — 돋보기 든 고슴도치
  fact_checker: {
    species: "고슴도치",
    body: "#fbecd6",
    back: (
      <path
        d="M14 52 L6 42 L16 38 L10 26 L22 26 L22 14 L33 20 L38 8 L46 17 L54 6 L60 17 L68 9 L70 21 L80 16 L79 28 L91 28 L84 39 L94 44 L86 52 Z"
        fill="#a87f61"
        {...line}
      />
    ),
    front: (
      <>
        <path d="M78 76 L88 86" {...line} strokeWidth={4} />
        <circle cx="74" cy="72" r="7" fill="#dff1fb" {...line} strokeWidth={2.6} />
      </>
    ),
  },
};

/** emoji 아바타 → 역할 역매핑 (role 정보가 없는 조회 결과 대비) */
const ROLE_BY_EMOJI = Object.fromEntries(Object.values(ROLE_CATALOG).map((r) => [r.avatar, r.key])) as Record<string, RoleKey>;

export function resolveCritterRole(role?: string | null, avatar?: string | null): RoleKey | null {
  if (role && role in CRITTERS) return role as RoleKey;
  if (avatar && ROLE_BY_EMOJI[avatar]) return ROLE_BY_EMOJI[avatar];
  return null;
}

function Blush({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="7" ry="4.2" fill="#f7a8b8" opacity={0.75} />
      {[-3, 0, 3].map((dx) => (
        <path key={dx} d={`M${cx + dx + 0.8} ${cy - 2} L${cx + dx - 0.8} ${cy + 2}`} stroke="#e46f8a" strokeWidth={1.1} strokeLinecap="round" />
      ))}
    </g>
  );
}

function Eye({ cx, cy, mood }: { cx: number; cy: number; mood: Mood }) {
  if (mood === "sleep") return <path d={`M${cx - 4.5} ${cy} Q${cx} ${cy + 3.5} ${cx + 4.5} ${cy}`} fill="none" {...line} strokeWidth={2.6} />;
  if (mood === "happy") return <path d={`M${cx - 4.5} ${cy + 1.5} Q${cx} ${cy - 4} ${cx + 4.5} ${cy + 1.5}`} fill="none" {...line} strokeWidth={2.6} />;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="5" ry="5.8" fill={INK} />
      <ellipse cx={cx + 1.4} cy={cy - 2} rx="2" ry="1.9" fill="#fff" />
      <circle cx={cx - 1.8} cy={cy + 2.4} r="0.9" fill="#fff" />
    </g>
  );
}

function Mouth({ y, mood, beak }: { y: number; mood: Mood; beak?: string }) {
  if (beak) {
    return mood === "talk" ? (
      <g>
        <path d={`M45 ${y - 1} L55 ${y - 1} L50 ${y + 3} Z`} fill={beak} {...line} strokeWidth={2.2} />
        <path d={`M46.5 ${y + 3} L53.5 ${y + 3} L50 ${y + 6} Z`} fill={beak} {...line} strokeWidth={2.2} />
      </g>
    ) : (
      <path d={`M45 ${y - 1} L55 ${y - 1} L50 ${y + 4} Z`} fill={beak} {...line} strokeWidth={2.2} />
    );
  }
  if (mood === "talk") return <path d={`M46 ${y} Q50 ${y + 7} 54 ${y} Z`} fill="#e46f8a" {...line} strokeWidth={2.2} />;
  if (mood === "sweat") return <path d={`M45 ${y + 2} Q47.5 ${y} 50 ${y + 2} Q52.5 ${y + 4} 55 ${y + 2}`} fill="none" {...line} strokeWidth={2.2} />;
  // 기본 ω 입
  return <path d={`M45 ${y} Q47.5 ${y + 3.5} 50 ${y} Q52.5 ${y + 3.5} 55 ${y}`} fill="none" {...line} strokeWidth={2.2} />;
}

export function Critter({ role, status = "working", className, title }: { role: RoleKey; status?: EmployeeStatus; className?: string; title?: string }) {
  const def = CRITTERS[role];
  const mood = MOOD_BY_STATUS[status];
  const ey = def.eyeY ?? 52;
  return (
    <svg viewBox="0 0 100 100" className={cn("overflow-visible", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      {def.back}
      <path d={BODY_PATH} fill={def.body} {...line} />
      {def.pattern}
      <Eye cx={38} cy={ey} mood={mood} />
      <Eye cx={62} cy={ey} mood={mood} />
      <Blush cx={26} cy={ey + 10} />
      <Blush cx={74} cy={ey + 10} />
      <Mouth y={ey + 9} mood={mood} beak={def.beak} />
      {def.front}
      {mood === "sweat" ? <path d="M80 30 C77 35 77 38 80 38 C83 38 83 35 80 30 Z" fill="#bfe3f7" {...line} strokeWidth={1.8} /> : null}
      {mood === "sleep" ? (
        <text x="80" y="18" fontSize="13" fontWeight="700" fill={INK}>
          z<tspan fontSize="9">z</tspan>
        </text>
      ) : null}
      {mood === "talk" ? (
        <g>
          <path d="M84 14 C84 8 98 8 98 14 C98 19 92 20 89 19 L85 23 L86 18 C84 17 84 16 84 14 Z" fill="#fff" {...line} strokeWidth={1.8} />
          <circle cx="88" cy="14" r="0.9" fill={INK} />
          <circle cx="91" cy="14" r="0.9" fill={INK} />
          <circle cx="94" cy="14" r="0.9" fill={INK} />
        </g>
      ) : null}
    </svg>
  );
}

const SIZE = {
  xs: "size-6",
  sm: "size-9",
  md: "size-14",
  lg: "size-20",
  xl: "size-28",
} as const;

/** 우선순위: 사용자 이미지 슬롯(avatar-images.ts) → 역할별 동물 캐릭터 → emoji */
export function CritterAvatar({
  role,
  avatar,
  status,
  size = "md",
  className,
}: {
  role?: string | null;
  avatar?: string | null;
  status?: EmployeeStatus;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const key = resolveCritterRole(role, avatar);
  if (!key) {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center", SIZE[size], className)} aria-hidden>
        <span className="text-[1.4em] leading-none">{avatar ?? "🤖"}</span>
      </span>
    );
  }
  const image = AVATAR_IMAGES[key];
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 사용자가 넣은 임의 크기 이미지를 그대로 표시
      <img
        src={image}
        alt=""
        aria-hidden
        draggable={false}
        className={cn("shrink-0 object-contain", SIZE[size], status === "offline" && "grayscale", className)}
      />
    );
  }
  return <Critter role={key} status={status} className={cn("shrink-0", SIZE[size], className)} />;
}
