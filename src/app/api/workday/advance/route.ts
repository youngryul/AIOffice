import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { companyFromRequest } from "@/lib/services/api-auth";
import { advanceRun } from "@/lib/agents/workflow/engine";
import { errorMessage } from "@/lib/ai/errors";

// 한 단계(병렬 리서치 + 웹 검색)가 수 분 걸릴 수 있다
export const maxDuration = 300;

const Body = z.object({ runId: z.string().uuid() });

/** Run 을 한 단계 진행한다 (클라이언트가 done 이 될 때까지 반복 호출) */
export async function POST(request: Request) {
  const auth = await companyFromRequest();
  if (auth instanceof NextResponse) return auth;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "runId 가 필요합니다." }, { status: 400 });
  try {
    // companyId 로 범위를 제한하므로 다른 회사의 runId 를 보내도 진행되지 않는다
    const result = await advanceRun(createAdminClient(), auth.companyId, parsed.data.runId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 400 });
  }
}
