import { useEffect, useMemo, useRef } from "react";
import { appendEvent } from "../db/database";
import type { EventType, Session } from "../types";

const IDLE_THRESHOLD_MS = 20_000;
const IDLE_POLL_MS = 4_000;

export interface EventLogger {
  log: (type: EventType, payload?: Record<string, unknown>) => void;
  noteActivity: () => void;
}

/** Binds an append-only event logger to a session and tracks idle gaps. */
export function useEventLogger(session: Session | null): EventLogger {
  const lastActivityRef = useRef<number>(Date.now());
  const idleStartRef = useRef<number | null>(null);
  const sessionRef = useRef<Session | null>(session);
  sessionRef.current = session;

  const logger = useMemo<EventLogger>(() => {
    const log = (type: EventType, payload: Record<string, unknown> = {}) => {
      const s = sessionRef.current;
      if (!s) return;
      void appendEvent({
        sessionId: s.id,
        campaignId: s.campaignId,
        studentId: s.studentId,
        timestampMs: Date.now(),
        eventType: type,
        payload,
      }).catch((e) => console.warn("Failed to append event", type, e));
    };

    const noteActivity = () => {
      const now = Date.now();
      if (idleStartRef.current !== null) {
        const duration = now - idleStartRef.current;
        idleStartRef.current = null;
        if (duration >= IDLE_THRESHOLD_MS) {
          log("idle", { durationMs: duration });
        }
      }
      lastActivityRef.current = now;
    };

    return { log, noteActivity };
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (
        idleStartRef.current === null &&
        now - lastActivityRef.current > IDLE_THRESHOLD_MS
      ) {
        idleStartRef.current = lastActivityRef.current;
      }
    }, IDLE_POLL_MS);
    return () => window.clearInterval(interval);
  }, [session]);

  return logger;
}
