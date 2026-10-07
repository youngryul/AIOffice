import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { companyFromRequest } from "@/lib/services/api-auth";
import { cancelRun } from "@/lib/agents/workflow/engine";

const Body = z.object({ runId: z.string().uuid() });

export async function POST(request: Request) {
  const auth = await companyFromRequest();
  if (auth instanceof NextResponse) return auth;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "runId 가 필요합니다." }, { status: 400 });
  await cancelRun(createAdminClient(), auth.companyId, parsed.data.runId);
  return NextResponse.json({ ok: true });
}
