import { ROLE_CATALOG } from "@/lib/agents/roles";
import { AVATAR_IMAGES } from "@/lib/avatar-images";
import type { EmployeeStatus, RoleKey } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

/**
 * 손그림 스티커 느낌의 "찹쌀떡 동물" 직원 캐릭터 (오리지널 디자인, 인라인 SVG).
 * - 가는 검정 펜선 + 하얀 찹쌀떡 몸통 + 작은 점눈 + 빗금 분홍 볼터치 + 짧은 팔
 * - 동물은 모자/후드/소품으로 표현하고, 상태(EmployeeStatus)에 따라 표정이 바뀐다.
 */

const INK = "#1f1a1a";
const SW = 2.4;
const FACE = "#fffdfb";

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
  /** 몸통 색 (대부분 하얀 찹쌀떡) */
  body?: string;
  /** 몸통 뒤에 그려지는 요소 (귀, 꼬리, 가시, 털뭉치) */
  back?: React.ReactNode;
  /** 몸통 위, 얼굴 아래 (후드, 모자, 무늬) */
  pattern?: React.ReactNode;
  /** 얼굴 위에 덧그리는 소품 (안경, 헤드폰, 넥타이…) */
  front?: React.ReactNode;
  /** 기본 짧은 팔을 그리지 않을 때 */
  noArms?: boolean;
  /** 입 대신 부리 등을 쓰는 경우 */
  beak?: string;
}

const line = { stroke: INK, strokeWidth: SW, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** 찹쌀떡 몸통 (작은 발 포함) */
const BODY_PATH =
  "M50 20 C73 20 86 36 86 56 C86 73 76 84 62 86 C61 90 57 91 55 87 C52 88 48 88 45 87 C43 91 39 90 38 86 C24 84 14 73 14 56 C14 36 27 20 50 20 Z";

/** 머리 윗부분을 덮는 후드/모자 모양 (얼굴 위쪽 경계가 살짝 둥근 곡선) */
const HOOD_PATH = "M50 20 C73 20 86 36 86 52 C78 42 65 38 50 39 C35 38 22 42 14 52 C14 36 27 20 50 20 Z";

const EYE_Y = 56;

export const CRITTERS: Record<RoleKey, CritterDef> = {
  // 🐧 비서실장 — 남색 모자를 쓴 펭귄, 나비넥타이
  chief_of_staff: {
    species: "펭귄",
    pattern: <path d={HOOD_PATH} fill="#7c8fb8" {...line} />,
    front: (
      <>
        <path d="M50 78 L42 74 L42 82 Z M50 78 L58 74 L58 82 Z" fill="#f4a3b6" {...line} strokeWidth={1.8} />
        <circle cx="50" cy="78" r="2" fill="#f4a3b6" {...line} strokeWidth={1.6} />
      </>
    ),
    beak: "#f8c46a",
  },
  // 🦉 AI 트렌드 리서처 — 귀깃털 + 동그란 안경 부엉이
  ai_trend_researcher: {
    species: "부엉이",
    body: "#f3eefc",
    back: (
      <>
        <path d="M26 32 L22 14 L38 24 Z" fill="#c9b8ec" {...line} />
        <path d="M74 32 L78 14 L62 24 Z" fill="#c9b8ec" {...line} />
      </>
    ),
    front: (
      <>
        <circle cx="40" cy={EYE_Y} r="7.5" fill="none" {...line} strokeWidth={1.9} />
        <circle cx="60" cy={EYE_Y} r="7.5" fill="none" {...line} strokeWidth={1.9} />
        <path d={`M47.5 ${EYE_Y - 1} Q50 ${EYE_Y - 3} 52.5 ${EYE_Y - 1}`} fill="none" {...line} strokeWidth={1.9} />
      </>
    ),
    beak: "#f8c46a",
  },
  // 🐸 바이브코딩 리서처 — 개구리 후드 + 헤드폰
  vibe_coding_researcher: {
    species: "개구리",
    back: (
      <>
        <circle cx="34" cy="25" r="9.5" fill="#a9dca4" {...line} />
        <circle cx="66" cy="25" r="9.5" fill="#a9dca4" {...line} />
        <circle cx="34" cy="24" r="3" fill={INK} />
        <circle cx="66" cy="24" r="3" fill={INK} />
      </>
    ),
    pattern: <path d={HOOD_PATH} fill="#a9dca4" {...line} />,
    front: (
      <>
        <rect x="8" y="48" width="10" height="16" rx="5" fill="#9fc0f2" {...line} strokeWidth={2} />
        <rect x="82" y="48" width="10" height="16" rx="5" fill="#9fc0f2" {...line} strokeWidth={2} />
      </>
    ),
  },
  // 🦝 시장조사 분석가 — 너구리 귀모자 + 줄무늬 꼬리
  market_researcher: {
    species: "너구리",
    back: (
      <>
        <circle cx="28" cy="27" r="8" fill="#a59c95" {...line} />
        <circle cx="72" cy="27" r="8" fill="#a59c95" {...line} />
        <path d="M82 76 C94 74 98 62 92 56 C88 64 84 68 80 70 Z" fill="#a59c95" {...line} />
        <path d="M89 59 L93 63 M86 66 L90 69" {...line} strokeWidth={1.8} />
      </>
    ),
    pattern: <path d={HOOD_PATH} fill="#c9c1bb" {...line} />,
  },
  // 🐕 사업기회 분석가 — 시바 귀모자 + 넥타이
  business_analyst: {
    species: "시바견",
    back: (
      <>
        <path d="M22 38 L24 16 L40 26 Z" fill="#f1b47c" {...line} />
        <path d="M78 38 L76 16 L60 26 Z" fill="#f1b47c" {...line} />
      </>
    ),
    pattern: <path d={HOOD_PATH} fill="#f1b47c" {...line} />,
    front: (
      <path d="M50 72 L46 75 L48 86 L50 88 L52 86 L54 75 Z" fill="#7d9ad1" {...line} strokeWidth={1.8} />
    ),
  },
  // 🐑 브랜드 전략가 — 몽글몽글 양털 모자
  brand_strategist: {
    species: "양",
    back: (
      <>
        <ellipse cx="15" cy="46" rx="7.5" ry="4.5" fill="#e6cdb8" {...line} transform="rotate(-25 15 46)" />
        <ellipse cx="85" cy="46" rx="7.5" ry="4.5" fill="#e6cdb8" {...line} transform="rotate(25 85 46)" />
      </>
    ),
    pattern: (
      <path
        d="M22 44 C16 36 22 26 30 28 C30 18 42 14 47 21 C52 13 66 16 66 26 C74 22 84 32 78 42 C72 38 66 40 64 42 C60 36 54 36 50 40 C46 36 40 36 36 42 C32 38 26 40 22 44 Z"
        fill="#fbf4ea"
        {...line}
      />
    ),
  },
  // 🐥 콘텐츠 기획자 — 병아리 후드 + 새싹
  content_strategist: {
    species: "병아리",
    back: (
      <>
        <path d="M50 20 C50 15 50 12 50 10" fill="none" {...line} />
        <path d="M50 12 C43 5 37 9 39 13 C43 15 48 13 50 12 Z" fill="#a6d99b" {...line} strokeWidth={2} />
        <path d="M50 12 C57 5 63 9 61 13 C57 15 52 13 50 12 Z" fill="#a6d99b" {...line} strokeWidth={2} />
      </>
    ),
    pattern: <path d={HOOD_PATH} fill="#fde58f" {...line} />,
    beak: "#f8b25e",
  },
  // 🦔 팩트체커 — 가시 머리 고슴도치 + 돋보기
  fact_checker: {
    species: "고슴도치",
    back: (
      <path
        d="M16 50 L8 42 L17 38 L12 27 L23 27 L23 16 L33 22 L38 11 L46 19 L53 9 L59 19 L67 12 L68 23 L78 19 L77 29 L88 30 L82 39 L92 43 L84 50 Z"
        fill="#c69d7c"
        {...line}
      />
    ),
    pattern: <path d={HOOD_PATH} fill="#c69d7c" {...line} />,
    noArms: true,
    front: (
      <>
        <path d="M16 66 C11 68 11 74 17 74" fill="none" {...line} />
        <path d="M84 64 C90 62 92 68 86 72" fill="none" {...line} />
        <path d="M86 74 L94 84" {...line} strokeWidth={3.2} />
        <circle cx="82" cy="69" r="6.5" fill="#e4f4fc" {...line} strokeWidth={2} />
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

/** 빗금 분홍 볼터치 */
function Blush({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="6" ry="3.4" fill="#fbb8c6" opacity={0.8} />
      {[-3, -1, 1, 3].map((dx) => (
        <path key={dx} d={`M${cx + dx + 0.7} ${cy - 1.6} L${cx + dx - 0.7} ${cy + 1.6}`} stroke="#ec7f98" strokeWidth={0.9} strokeLinecap="round" />
      ))}
    </g>
  );
}

function Eye({ cx, cy, mood }: { cx: number; cy: number; mood: Mood }) {
  if (mood === "sleep") return <path d={`M${cx - 3.5} ${cy} Q${cx} ${cy + 2.8} ${cx + 3.5} ${cy}`} fill="none" {...line} strokeWidth={2} />;
  if (mood === "happy") return <path d={`M${cx - 3.5} ${cy + 1.2} Q${cx} ${cy - 3} ${cx + 3.5} ${cy + 1.2}`} fill="none" {...line} strokeWidth={2} />;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="3.4" ry="4.2" fill={INK} />
      <circle cx={cx + 1} cy={cy - 1.6} r="1.3" fill="#fff" />
    </g>
  );
}

function Mouth({ y, mood, beak }: { y: number; mood: Mood; beak?: string }) {
  if (beak) {
    return mood === "talk" ? (
      <g>
        <path d={`M46.5 ${y - 1} L53.5 ${y - 1} L50 ${y + 2} Z`} fill={beak} {...line} strokeWidth={1.6} />
        <path d={`M47.5 ${y + 2.5} L52.5 ${y + 2.5} L50 ${y + 5} Z`} fill={beak} {...line} strokeWidth={1.6} />
      </g>
    ) : (
      <path d={`M46.5 ${y - 1} L53.5 ${y - 1} L50 ${y + 2.5} Z`} fill={beak} {...line} strokeWidth={1.6} />
    );
  }
  if (mood === "talk") return <path d={`M47 ${y} Q50 ${y + 5.5} 53 ${y} Z`} fill="#ef8aa2" {...line} strokeWidth={1.6} />;
  if (mood === "sweat") return <path d={`M46.5 ${y + 1.5} Q48.2 ${y} 50 ${y + 1.5} Q51.8 ${y + 3} 53.5 ${y + 1.5}`} fill="none" {...line} strokeWidth={1.6} />;
  // 기본 ω 입 (작게)
  return <path d={`M47 ${y} Q48.5 ${y + 2.4} 50 ${y} Q51.5 ${y + 2.4} 53 ${y}`} fill="none" {...line} strokeWidth={1.6} />;
}

/** 몸통 앞에 붙은 짧은 팔 */
function Arms() {
  return (
    <>
      <path d="M17 66 C12 68 12 74 18 74" fill="none" {...line} />
      <path d="M83 66 C88 68 88 74 82 74" fill="none" {...line} />
    </>
  );
}

export function Critter({ role, status = "working", className, title }: { role: RoleKey; status?: EmployeeStatus; className?: string; title?: string }) {
  const def = CRITTERS[role];
  const mood = MOOD_BY_STATUS[status];
  const ey = EYE_Y;
  return (
    <svg viewBox="0 0 100 100" className={cn("overflow-visible", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      {def.back}
      <path d={BODY_PATH} fill={def.body ?? FACE} {...line} />
      {def.pattern}
      <Eye cx={40} cy={ey} mood={mood} />
      <Eye cx={60} cy={ey} mood={mood} />
      <Blush cx={29} cy={ey + 8} />
      <Blush cx={71} cy={ey + 8} />
      <Mouth y={ey + 7} mood={mood} beak={def.beak} />
      {def.noArms ? null : <Arms />}
      {def.front}
      {mood === "sweat" ? <path d="M80 32 C77 37 77 40 80 40 C83 40 83 37 80 32 Z" fill="#bfe3f7" {...line} strokeWidth={1.5} /> : null}
      {mood === "sleep" ? (
        <text x="80" y="18" fontSize="13" fontWeight="700" fill={INK}>
          z<tspan fontSize="9">z</tspan>
        </text>
      ) : null}
      {mood === "talk" ? (
        <g>
          <path d="M84 14 C84 8 98 8 98 14 C98 19 92 20 89 19 L85 23 L86 18 C84 17 84 16 84 14 Z" fill="#fff" {...line} strokeWidth={1.5} />
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
