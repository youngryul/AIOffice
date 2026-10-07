import "server-only";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { getSession } from "./session";

/**
 * Route Handler 용 인증. company_id 는 요청 body 가 아니라 로그인 사용자의 profile 에서만 얻는다.
 */
export async function companyFromRequest(): Promise<{ companyId: string; userId: string } | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const companyId = session.profile?.company_id;
  if (!companyId) return NextResponse.json({ error: "회사가 없습니다. 온보딩을 완료하세요." }, { status: 403 });
  return { companyId, userId: session.userId };
}

/** Cron 요청 검증: Authorization: Bearer <CRON_SECRET> (Vercel Cron 이 자동으로 붙인다) */
export function verifyCron(request: Request): NextResponse | null {
  const secret = env().CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET 이 설정되지 않았습니다." }, { status: 500 });
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
