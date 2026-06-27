export type DisclosureLevel = "strict" | "balanced" | "permissive";

export interface Objective {
  id: string;
  name: string;
}

export interface StarterFile {
  name: string;
  language: "python" | "javascript";
  content: string;
}

export interface Disclosure {
  default: DisclosureLevel;
  /** Optional per-objective overrides, keyed by objective id. */
  perObjective: Record<string, DisclosureLevel>;
}

export interface AllowedResources {
  languageDocs: boolean;
  openWeb: boolean;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  taskPrompt: string;
  starterFiles: StarterFile[];
  objectives: Objective[];
  disclosure: Disclosure;
  allowedResources: AllowedResources;
  timeBudgetMin: number | null;
  createdAt: number;
}

export type SessionStatus = "started" | "paused" | "resumed" | "submitted";

export interface Session {
  id: string;
  campaignId: string;
  studentId: string;
  startedAt: number;
  endedAt: number | null;
  status: SessionStatus;
  accommodated: boolean;
}

export type EventType =
  | "edit"
  | "run"
  | "output"
  | "error"
  | "paste"
  | "agent_request"
  | "agent_reply"
  | "hypothesis"
  | "idle"
  | "task_state"
  | "flag";

export interface SessionEvent {
  id?: number;
  sessionId: string;
  campaignId: string;
  studentId: string;
  timestampMs: number;
  eventType: EventType;
  payload: Record<string, unknown>;
}

// ---- Analysis report (Mode C) ----

export interface ObjectiveOutcome {
  objective: string;
  maxRung: number;
  transfer: "demonstrated" | "partial" | "not-observed";
  note: string;
}

export interface AttentionMoment {
  timestampMs: number;
  note: string;
}

export interface AnalysisReport {
  narrative: string;
  perObjective: ObjectiveOutcome[];
  notableQuestions: string[];
  attentionMoments: AttentionMoment[];
  oneLineSummary: string;
}
