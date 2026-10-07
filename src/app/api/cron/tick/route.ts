import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCron } from "@/lib/services/api-auth";
import { runSchedulerTick } from "@/lib/agents/workflow/scheduler";
import { processNotionQueue } from "@/lib/notion/sync";
import { errorMessage } from "@/lib/ai/errors";

export const maxDuration = 300;

/**
 * Cron (Supabase Cron 5분 간격 권장 / Vercel Cron)
 *  1) REAL MODE 업무시간 스케줄 실행  2) 멈춘 FAST Run 재개  3) Notion Sync Queue 처리
 */
export async function GET(request: Request) {
  const denied = verifyCron(request);
  if (denied) return denied;
  const db = createAdminClient();
  const result: Record<string, unknown> = {};
  try {
    result.scheduler = await runSchedulerTick(db);
  } catch (err) {
    result.schedulerError = errorMessage(err);
  }
  try {
    result.notion = await processNotionQueue(db, { limit: 30 });
  } catch (err) {
    result.notionError = errorMessage(err);
  }
  return NextResponse.json(result);
}

export const POST = GET;
