import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import {
  AnalysisOutputSchema,
  ContentOutputSchema,
  ExecutiveSummarySchema,
  MeetingMinutesSchema,
  MeetingTurnSchema,
  MemorySummarySchema,
  MorningPlanSchema,
  ReviewOutputSchema,
  WorkOutputSchema,
} from "@/lib/agents/schemas";

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  $defs?: Record<string, JsonSchema>;
  definitions?: Record<string, JsonSchema>;
};

/** OpenAI Structured Output strict mode 규칙: 모든 object 는 모든 속성이 required + additionalProperties:false */
function assertStrict(schema: JsonSchema, path = "$"): void {
  if (schema.properties) {
    expect(schema.additionalProperties, `${path}.additionalProperties`).toBe(false);
    expect(new Set(schema.required ?? []), `${path}.required`).toEqual(new Set(Object.keys(schema.properties)));
    for (const [k, v] of Object.entries(schema.properties)) assertStrict(v, `${path}.${k}`);
  }
  if (schema.items) assertStrict(schema.items, `${path}[]`);
  for (const s of schema.anyOf ?? []) assertStrict(s, `${path}|`);
  for (const [k, v] of Object.entries({ ...schema.$defs, ...schema.definitions })) assertStrict(v, `${path}#${k}`);
}

const SCHEMAS = {
  research_output: WorkOutputSchema,
  morning_plan: MorningPlanSchema,
  team_review: ReviewOutputSchema,
  business_analysis: AnalysisOutputSchema,
  content_factory: ContentOutputSchema,
  meeting_turn: MeetingTurnSchema,
  meeting_minutes: MeetingMinutesSchema,
  executive_summary: ExecutiveSummarySchema,
  feedback_lesson: MemorySummarySchema,
};

describe("Structured Output schemas", () => {
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    it(`${name} converts to a strict OpenAI JSON schema`, () => {
      const format = zodTextFormat(schema, name);
      expect(format.type).toBe("json_schema");
      expect(format.strict).toBe(true);
      assertStrict(format.schema as JsonSchema);
    });
  }

  it("parses model output back through the same schema", () => {
    const format = zodTextFormat(MeetingTurnSchema, "meeting_turn");
    const parsed = format.$parseRaw(JSON.stringify({ opinion: "o", key_points: [], responses: [{ participant_index: 1, stance: "agree", comment: "c" }] }));
    expect(parsed.responses[0].stance).toBe("agree");
  });
});
