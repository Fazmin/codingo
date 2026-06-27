import type Database from "@tauri-apps/plugin-sql";
import { isTauri, uid } from "../utils";
import type {
  AnalysisReport,
  Campaign,
  Session,
  SessionEvent,
  SessionStatus,
} from "../types";

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!isTauri()) {
    throw new Error(
      "Local database is only available in the desktop app. Run with `npm run tauri:dev`.",
    );
  }
  if (!dbPromise) {
    dbPromise = import("@tauri-apps/plugin-sql").then((m) =>
      m.default.load("sqlite:socratic.db"),
    );
  }
  return dbPromise;
}

// ---- Campaigns ----

interface CampaignRow {
  id: string;
  title: string;
  description: string | null;
  task_prompt: string | null;
  starter_files: string | null;
  objectives: string | null;
  disclosure: string | null;
  allowed_resources: string | null;
  time_budget_min: number | null;
  created_at: number;
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToCampaign(r: CampaignRow): Campaign {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    taskPrompt: r.task_prompt ?? "",
    starterFiles: parse(r.starter_files, []),
    objectives: parse(r.objectives, []),
    disclosure: parse(r.disclosure, { default: "balanced", perObjective: {} }),
    allowedResources: parse(r.allowed_resources, {
      languageDocs: true,
      openWeb: false,
    }),
    timeBudgetMin: r.time_budget_min,
    createdAt: r.created_at,
  };
}

export async function saveCampaign(c: Campaign): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO campaigns
      (id, title, description, task_prompt, starter_files, objectives, disclosure, allowed_resources, time_budget_min, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT(id) DO UPDATE SET
       title=$2, description=$3, task_prompt=$4, starter_files=$5,
       objectives=$6, disclosure=$7, allowed_resources=$8, time_budget_min=$9`,
    [
      c.id,
      c.title,
      c.description,
      c.taskPrompt,
      JSON.stringify(c.starterFiles),
      JSON.stringify(c.objectives),
      JSON.stringify(c.disclosure),
      JSON.stringify(c.allowedResources),
      c.timeBudgetMin,
      c.createdAt,
    ],
  );
}

export async function listCampaigns(): Promise<Campaign[]> {
  const db = await getDb();
  const rows = await db.select<CampaignRow[]>(
    "SELECT * FROM campaigns ORDER BY created_at DESC",
  );
  return rows.map(rowToCampaign);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const db = await getDb();
  const rows = await db.select<CampaignRow[]>(
    "SELECT * FROM campaigns WHERE id = $1",
    [id],
  );
  return rows[0] ? rowToCampaign(rows[0]) : null;
}

export async function deleteCampaign(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM campaigns WHERE id = $1", [id]);
}

// ---- Sessions ----

interface SessionRow {
  id: string;
  campaign_id: string;
  student_id: string;
  started_at: number;
  ended_at: number | null;
  status: SessionStatus;
  accommodated: number;
}

function rowToSession(r: SessionRow): Session {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    studentId: r.student_id,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    status: r.status,
    accommodated: !!r.accommodated,
  };
}

export async function createSession(
  campaignId: string,
  studentId: string,
  accommodated: boolean,
): Promise<Session> {
  const db = await getDb();
  const session: Session = {
    id: uid("ses_"),
    campaignId,
    studentId,
    startedAt: Date.now(),
    endedAt: null,
    status: "started",
    accommodated,
  };
  await db.execute(
    `INSERT INTO sessions (id, campaign_id, student_id, started_at, ended_at, status, accommodated)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      session.id,
      session.campaignId,
      session.studentId,
      session.startedAt,
      null,
      session.status,
      accommodated ? 1 : 0,
    ],
  );
  return session;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  ended = false,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE sessions SET status = $1, ended_at = $2 WHERE id = $3",
    [status, ended ? Date.now() : null, sessionId],
  );
}

export async function listSessionsForCampaign(
  campaignId: string,
): Promise<Session[]> {
  const db = await getDb();
  const rows = await db.select<SessionRow[]>(
    "SELECT * FROM sessions WHERE campaign_id = $1 ORDER BY started_at DESC",
    [campaignId],
  );
  return rows.map(rowToSession);
}

export async function getSession(id: string): Promise<Session | null> {
  const db = await getDb();
  const rows = await db.select<SessionRow[]>(
    "SELECT * FROM sessions WHERE id = $1",
    [id],
  );
  return rows[0] ? rowToSession(rows[0]) : null;
}

// ---- Events (append-only log) ----

interface EventRow {
  id: number;
  session_id: string;
  campaign_id: string;
  student_id: string;
  timestamp_ms: number;
  event_type: string;
  payload: string | null;
}

function rowToEvent(r: EventRow): SessionEvent {
  return {
    id: r.id,
    sessionId: r.session_id,
    campaignId: r.campaign_id,
    studentId: r.student_id,
    timestampMs: r.timestamp_ms,
    eventType: r.event_type as SessionEvent["eventType"],
    payload: parse(r.payload, {}),
  };
}

export async function appendEvent(ev: SessionEvent): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO events (session_id, campaign_id, student_id, timestamp_ms, event_type, payload)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      ev.sessionId,
      ev.campaignId,
      ev.studentId,
      ev.timestampMs,
      ev.eventType,
      JSON.stringify(ev.payload ?? {}),
    ],
  );
}

export async function getEvents(sessionId: string): Promise<SessionEvent[]> {
  const db = await getDb();
  const rows = await db.select<EventRow[]>(
    "SELECT * FROM events WHERE session_id = $1 ORDER BY timestamp_ms ASC, id ASC",
    [sessionId],
  );
  return rows.map(rowToEvent);
}

export async function countEvents(sessionId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    "SELECT COUNT(*) as n FROM events WHERE session_id = $1",
    [sessionId],
  );
  return rows[0]?.n ?? 0;
}

// ---- Reports cache ----

export async function saveReport(
  sessionId: string,
  report: AnalysisReport,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO reports (session_id, generated_at, data)
     VALUES ($1,$2,$3)
     ON CONFLICT(session_id) DO UPDATE SET generated_at=$2, data=$3`,
    [sessionId, Date.now(), JSON.stringify(report)],
  );
}

export async function getReport(
  sessionId: string,
): Promise<AnalysisReport | null> {
  const db = await getDb();
  const rows = await db.select<{ data: string }[]>(
    "SELECT data FROM reports WHERE session_id = $1",
    [sessionId],
  );
  return rows[0] ? (JSON.parse(rows[0].data) as AnalysisReport) : null;
}
