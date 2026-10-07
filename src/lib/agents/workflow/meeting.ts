import "server-only";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { MeetingMinutesSchema, MeetingTurnSchema, type MeetingMinutesOutput, type MeetingTurn } from "@/lib/agents/schemas";
import { meetingMinutesPrompt, meetingOpinionPrompt } from "@/lib/agents/prompts/tasks";
import type { AgentEmployee } from "@/lib/agents/agent";
import type { WorkflowContext } from "./context";
import { createMeeting, runLimited, validIndex } from "./helpers";

export const MAX_MEETING_ROUNDS = 3;
export const DEFAULT_MEETING_ROUNDS = 2;

export interface MeetingParticipant {
  agent: AgentEmployee;
  /** 이 참가자의 오늘 업무 결과 요약 (의견의 근거) */
  myWork: string;
}

/**
 * 회의 엔진.
 *  Round 1: 각자 자신의 조사 결과를 근거로 의견 제시
 *  Round 2~: 다른 참가자의 의견을 보고 동의 / 반대 / 보완
 *  마지막: Coordinator 가 회의록 작성 (meeting_minutes)
 * 모든 AI 에게 같은 질문을 반복하지 않도록, 라운드마다 "다른 사람의 직전 발언"을 입력으로 준다.
 */
export async function runMeeting(
  ctx: WorkflowContext,
  params: {
    type: "team" | "executive" | "project";
    topic: string;
    coordinator: AgentEmployee;
    participants: MeetingParticipant[];
    rounds?: number;
  },
) {
  const rounds = Math.min(Math.max(params.rounds ?? DEFAULT_MEETING_ROUNDS, 1), MAX_MEETING_ROUNDS);
  const participants = params.participants;
  const meeting = await createMeeting(ctx, {
    type: params.type,
    topic: params.topic,
    coordinatorId: params.coordinator.id,
    participantIds: [params.coordinator.id, ...participants.map((p) => p.agent.id)],
  });
  await Promise.all([params.coordinator, ...participants.map((p) => p.agent)].map((a) => a.setStatus("meeting")));

  const transcript: { round: number; speaker: number; turn: MeetingTurn; messageId: string | null }[] = [];

  for (let round = 1; round <= rounds; round++) {
    const previous = transcript.filter((t) => t.round === round - 1);
    const turns = await runLimited(participants, 4, async (p) => {
      const myIndex = participants.indexOf(p);
      const others = previous
        .filter((t) => t.speaker !== myIndex)
        .map((t) => `[${t.speaker}] ${participants[t.speaker].agent.name}: ${t.turn.opinion}`)
        .join("\n");
      const res = await p.agent.run({
        purpose: `meeting_round_${round}`,
        schema: MeetingTurnSchema,
        schemaName: "meeting_turn",
        include: ["company"],
        taskPrompt: meetingOpinionPrompt({ topic: params.topic, myWork: p.myWork, round, others: round > 1 ? others : null }),
      });
      return { speaker: myIndex, turn: res.output };
    });

    for (const t of turns) {
      if (t.status !== "fulfilled") {
        ctx.log(`⚠️ 회의 발언 실패: ${t.reason instanceof Error ? t.reason.message : String(t.reason)}`);
        continue;
      }
      const { speaker, turn } = t.value;
      const msgs: TablesInsert<"meeting_messages">[] = [
        {
          meeting_id: meeting.id,
          company_id: ctx.company.id,
          employee_id: participants[speaker].agent.id,
          round,
          stance: "opinion",
          content: [turn.opinion, ...turn.key_points.map((k) => `• ${k}`)].join("\n"),
        },
      ];
      const prevMessageBySpeaker = new Map(previous.map((p) => [p.speaker, p.messageId]));
      for (const r of round > 1 ? turn.responses : []) {
        const target = validIndex(r.participant_index, participants.length);
        if (target === null || target === speaker) continue;
        msgs.push({
          meeting_id: meeting.id,
          company_id: ctx.company.id,
          employee_id: participants[speaker].agent.id,
          round,
          stance: r.stance,
          reply_to: prevMessageBySpeaker.get(target) ?? null,
          content: `@${participants[target].agent.name} ${r.comment}`,
        });
      }
      const { data: inserted } = await ctx.db.from("meeting_messages").insert(msgs).select("id, stance");
      transcript.push({ round, speaker, turn, messageId: inserted?.find((m) => m.stance === "opinion")?.id ?? null });
    }
  }

  // Coordinator 회의록
  const participantsText = participants.map((p, i) => `[${i}] ${p.agent.name} (${p.agent.role})`).join("\n");
  const transcriptText = transcript
    .map((t) => {
      const who = participants[t.speaker].agent.name;
      const reactions = t.turn.responses
        .map((r) => {
          const target = validIndex(r.participant_index, participants.length);
          return target === null ? null : `  - ${r.stance} → ${participants[target].agent.name}: ${r.comment}`;
        })
        .filter(Boolean)
        .join("\n");
      return `Round ${t.round} / ${who}: ${t.turn.opinion}${reactions ? `\n${reactions}` : ""}`;
    })
    .join("\n");

  let minutes: MeetingMinutesOutput | null = null;
  if (transcript.length) {
    const res = await params.coordinator.run({
      purpose: "meeting_minutes",
      schema: MeetingMinutesSchema,
      schemaName: "meeting_minutes",
      include: ["company", "ceoPreferences"],
      taskPrompt: meetingMinutesPrompt({ topic: params.topic, participants: participantsText, transcript: transcriptText }),
    });
    minutes = res.output;
  }

  await ctx.db.from("meeting_minutes").insert({
    meeting_id: meeting.id,
    company_id: ctx.company.id,
    topic: params.topic,
    participants: [params.coordinator.name, ...participants.map((p) => p.agent.name)],
    discussion: minutes?.discussion ?? "발언이 수집되지 않았습니다.",
    arguments: (minutes?.arguments ?? []).map((a) => ({
      participant: participants[validIndex(a.participant_index, participants.length) ?? -1]?.agent.name ?? "unknown",
      argument: a.argument,
    })),
    consensus: minutes?.consensus ?? null,
    disagreements: (minutes?.disagreements ?? []),
    decision: minutes?.decision ?? null,
    action_items: (minutes?.action_items ?? []).map((a) => ({
      owner: participants[validIndex(a.owner_index, participants.length) ?? -1]?.agent.name ?? params.coordinator.name,
      item: a.item,
    })),
    ceo_approval_required: minutes?.ceo_approval_required ?? false,
  });
  await ctx.db
    .from("meetings")
    .update({ status: "completed", rounds, ended_at: new Date().toISOString() })
    .eq("id", meeting.id);
  await Promise.all([params.coordinator, ...participants.map((p) => p.agent)].map((a) => a.setStatus("working")));

  return { meetingId: meeting.id, minutes };
}
