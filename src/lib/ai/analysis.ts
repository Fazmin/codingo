import { z } from "zod";
import { getChatModel } from "./provider";
import type { AnalysisReport, Campaign, SessionEvent } from "../types";

const reportSchema = z.object({
  oneLineSummary: z
    .string()
    .describe("A single-line summary of the session for the session list."),
  narrative: z
    .string()
    .describe("A 3-5 sentence narrative of how the student approached the task."),
  perObjective: z
    .array(
      z.object({
        objective: z.string(),
        maxRung: z
          .number()
          .int()
          .min(0)
          .max(4)
          .describe("Highest hint rung the student needed for this objective."),
        transfer: z
          .enum(["demonstrated", "partial", "not-observed"])
          .describe("Whether the student later showed independence on a similar step."),
        note: z.string().describe("Short evidence-based note."),
      }),
    )
    .describe("One entry per learning objective."),
  notableQuestions: z
    .array(z.string())
    .describe("The notable questions the student asked, verbatim or paraphrased."),
  attentionMoments: z
    .array(
      z.object({
        timestampMs: z
          .number()
          .describe("Exact event timestamp_ms the educator should look at in the replay."),
        note: z.string().describe("Why this moment is worth attention."),
      }),
    )
    .describe("Moments worth the educator's direct attention, each linked to a timestamp."),
});

const ANALYSIS_SYSTEM = `You are analyzing a recorded problem-solving session for an educator. Given the event
log, produce: (1) a 3-5 sentence narrative of how the student approached the task;
(2) for each learning objective, the highest hint rung they needed and whether they
later showed independence on a similar step (transfer); (3) the notable questions they
asked; (4) any moments worth the educator's direct attention with their timestamps. Do
not infer cheating; report observations and link every claim to timestamps so the
educator can verify in the replay. Reward evidence of genuine reasoning and transfer,
not performance of good-sounding questions. Every timestamp you cite must be an actual
timestamp_ms value taken from the event log provided.
When the student flagged a tutor reply as a possible hallucination, treat it as a
meaningful signal of their critical engagement: note it in the narrative and, where
relevant, add it as an attention moment with its timestamp so the educator can verify it
in the replay.`;

function serializeEvents(events: SessionEvent[], startedAt: number): string {
  return events
    .map((e) => {
      const rel = Math.round((e.timestampMs - startedAt) / 1000);
      let detail = "";
      switch (e.eventType) {
        case "agent_request":
          detail = `student asked: "${e.payload.text ?? ""}"`;
          break;
        case "agent_reply":
          detail = `tutor replied (rung ${e.payload.rung}, objective ${e.payload.objective}): "${e.payload.text ?? ""}"`;
          break;
        case "hypothesis":
          detail = `student hypothesis: "${e.payload.text ?? ""}"`;
          break;
        case "error":
          detail = `error: ${e.payload.message ?? ""} (line ${e.payload.line ?? "?"})`;
          break;
        case "run":
          detail = `ran ${e.payload.language ?? "code"} -> exit ${e.payload.exitCode ?? "?"}`;
          break;
        case "paste":
          detail = e.payload.blocked
            ? `attempted to paste ${e.payload.size ?? 0} chars into the chat (blocked by Lab mode)`
            : `pasted ${e.payload.size ?? 0} chars${e.payload.large ? " (LARGE)" : ""}`;
          break;
        case "flag":
          detail = `STUDENT FLAGGED a tutor reply as a possible hallucination${
            e.payload.reason ? `: "${e.payload.reason}"` : ""
          } (reply: "${String(e.payload.text ?? "").slice(0, 120)}")`;
          break;
        case "idle":
          detail = `idle for ${Math.round(Number(e.payload.durationMs ?? 0) / 1000)}s`;
          break;
        case "task_state":
          detail = `task ${e.payload.state ?? ""}`;
          break;
        case "edit":
          detail = `edit (${e.payload.length ?? 0} chars)`;
          break;
        case "output":
          detail = `output captured`;
          break;
      }
      return `t+${rel}s | ts=${e.timestampMs} | ${e.eventType} | ${detail}`;
    })
    .join("\n");
}

export async function analyzeSession(
  campaign: Campaign,
  events: SessionEvent[],
  startedAt: number,
): Promise<AnalysisReport> {
  const { generateObject } = await import("ai");
  const model = await getChatModel();

  const objectives = campaign.objectives.map((o) => o.name).join(", ") || "(none defined)";
  const log = serializeEvents(events, startedAt);

  const prompt = `Task prompt the student saw:
${campaign.taskPrompt || "(none)"}

Learning objectives: ${objectives}

Event log (${events.length} events; ts is the absolute timestamp_ms to cite):
${log || "(empty log)"}`;

  const { object } = await generateObject({
    model,
    schema: reportSchema,
    system: ANALYSIS_SYSTEM,
    prompt,
  });

  return object as AnalysisReport;
}
