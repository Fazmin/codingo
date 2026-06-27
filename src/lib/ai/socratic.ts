import { z } from "zod";
import { getChatModel } from "./provider";
import { disclosureCap } from "../utils";
import type { Campaign } from "../types";

export interface SocraticTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SocraticContext {
  campaign: Campaign;
  history: SocraticTurn[];
  studentUtterance: string;
  /** The highest rung used so far this session (null if first hint). */
  lastRung: number | null;
  /** Whether the student edited/ran code since the last agent reply. */
  attemptedSinceLastHint: boolean;
  /** Whether the agent has already heard a hypothesis this session. */
  heardHypothesis: boolean;
  /** Optional snapshot of current code + last error for grounding. */
  codeContext?: string;
}

export interface SocraticResult {
  reply: string;
  rung: number;
  objective: string;
  askedForHypothesis: boolean;
}

const resultSchema = z.object({
  reply: z
    .string()
    .describe("The spoken-friendly reply to the student. Short. Usually ends with a question."),
  rung: z
    .number()
    .int()
    .min(0)
    .max(4)
    .describe("The hint-ladder rung used: 0 reflect, 1 orient, 2 category, 3 concept, 4 partial example."),
  objective: z
    .string()
    .describe("The learning objective name this hint addresses."),
  askedForHypothesis: z
    .boolean()
    .describe("True if this reply asks the student for their own guess/hypothesis."),
});

function buildSystemPrompt(ctx: SocraticContext): string {
  const { campaign } = ctx;
  const objectives = campaign.objectives.map((o) => o.name).join(", ") || "general problem-solving";
  const level = campaign.disclosure.default;

  return `You are a Socratic coding tutor inside a learning workspace. You must NEVER give the
student a working solution, a complete line of code that resolves their problem, or the
exact term they're reaching for unless the hint ladder permits it. Your goal is to keep
the student doing the thinking.

On every turn:
1. If you have not yet heard the student's own hypothesis, ask for it before hinting.
2. Choose the LOWEST hint rung that could unblock them: 0 reflect, 1 orient attention,
   2 name the category, 3 name the concept (not implementation), 4 partial structure.
3. Only move to a higher rung than last time if the student has actually attempted
   something since. Repeated asking without effort does not earn escalation; gently
   redirect them to try.
4. Never exceed the disclosure cap for this campaign: ${level}.
   - strict: rarely pass Rung 2 (withhold hard, fundamentals).
   - balanced: up to Rung 3.
   - permissive: may give syntax at Rung 3-4 freely.
5. Keep replies short and spoken-friendly (1-3 sentences). End most replies with a question.

The current learning objectives are: ${objectives}. Tag your reply with the objective your
hint addresses, and report the rung used.

Session state you must respect:
- Have you heard a hypothesis yet? ${ctx.heardHypothesis ? "Yes" : "No"}.
- Highest rung used so far: ${ctx.lastRung === null ? "none" : ctx.lastRung}.
- Has the student attempted something since your last hint? ${ctx.attemptedSinceLastHint ? "Yes" : "No"}.
If no hypothesis has been heard, prefer rung 0 and set askedForHypothesis to true.
If they have not attempted anything since your last hint, do not escalate the rung.`;
}

export async function runSocraticTurn(ctx: SocraticContext): Promise<SocraticResult> {
  const { generateObject } = await import("ai");
  const model = await getChatModel();

  const contextBlock = ctx.codeContext
    ? `\n\n[Current workspace context]\n${ctx.codeContext.slice(0, 2000)}`
    : "";

  const messages = [
    ...ctx.history.map((t) => ({ role: t.role, content: t.content })),
    {
      role: "user" as const,
      content: `${ctx.studentUtterance}${contextBlock}`,
    },
  ];

  const { object } = await generateObject({
    model,
    schema: resultSchema,
    system: buildSystemPrompt(ctx),
    messages,
  });

  // Enforce the disclosure cap for the objective the model chose. The prompt
  // already instructs this, but we clamp deterministically so the logged rung
  // can never exceed the pedagogical cap.
  const objId = ctx.campaign.objectives.find(
    (o) => o.name.toLowerCase() === object.objective.toLowerCase(),
  )?.id;
  const level =
    (objId && ctx.campaign.disclosure.perObjective[objId]) ||
    ctx.campaign.disclosure.default;
  const cap = disclosureCap(level);

  return {
    reply: object.reply,
    rung: Math.min(object.rung, cap),
    objective: object.objective,
    askedForHypothesis: object.askedForHypothesis,
  };
}
