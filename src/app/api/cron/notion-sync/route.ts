import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCron } from "@/lib/services/api-auth";
import { processNotionQueue } from "@/lib/notion/sync";
import { errorMessage } from "@/lib/ai/errors";

export const maxDuration = 120;

/** Notion Sync Queue 만 처리하는 Cron 엔드포인트 */
export async function GET(request: Request) {
  const denied = verifyCron(request);
  if (denied) return denied;
  try {
    return NextResponse.json(await processNotionQueue(createAdminClient(), { limit: 50 }));
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

export const POST = GET;
