import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { companyFromRequest } from "@/lib/services/api-auth";
import { RunAlreadyActiveError, startRun } from "@/lib/agents/workflow/engine";
import { errorMessage } from "@/lib/ai/errors";

/** FAST MODE: "오늘 업무 실행" — 새 업무 사이클을 만든다. 단계 진행은 /api/workday/advance */
export async function POST() {
  const auth = await companyFromRequest();
  if (auth instanceof NextResponse) return auth;
  try {
    const run = await startRun(createAdminClient(), auth.companyId, "FAST");
    return NextResponse.json({ run });
  } catch (err) {
    if (err instanceof RunAlreadyActiveError) return NextResponse.json({ run: err.run, resumed: true });
    return NextResponse.json({ error: errorMessage(err) }, { status: 400 });
  }
}
