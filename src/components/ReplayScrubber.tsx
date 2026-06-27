import { useMemo } from "react";
import { EditorPane } from "./EditorPane";
import { formatClock } from "../lib/utils";
import type { SessionEvent } from "../lib/types";

const MARKER_COLOR: Record<string, string> = {
  agent_reply: "bg-accent",
  agent_request: "bg-sky-400",
  error: "bg-danger",
  run: "bg-success",
  paste: "bg-warning",
  hypothesis: "bg-amber-400",
  idle: "bg-fg-muted/40",
  task_state: "bg-violet-400",
  edit: "bg-fg-muted/25",
  output: "bg-fg-muted/20",
  flag: "bg-rose-500",
};

interface ReplayScrubberProps {
  events: SessionEvent[];
  startedAt: number;
  endedAt: number;
  timeMs: number;
  onSeek: (ts: number) => void;
}

export function ReplayScrubber({
  events,
  startedAt,
  endedAt,
  timeMs,
  onSeek,
}: ReplayScrubberProps) {
  const duration = Math.max(1, endedAt - startedAt);

  const reconstructed = useMemo(() => {
    let content = "";
    let language: "python" | "javascript" = "python";
    for (const e of events) {
      if (e.timestampMs > timeMs) break;
      if (e.eventType === "edit" && typeof e.payload.snapshot === "string") {
        content = e.payload.snapshot as string;
        const name = String(e.payload.file ?? "");
        if (name.endsWith(".js") || name.endsWith(".ts")) language = "javascript";
        else if (name.endsWith(".py")) language = "python";
      }
    }
    return { content, language };
  }, [events, timeMs]);

  const current = useMemo(() => {
    let last: SessionEvent | null = null;
    for (const e of events) {
      if (e.timestampMs > timeMs) break;
      last = e;
    }
    return last;
  }, [events, timeMs]);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="h-64">
          <EditorPane
            value={reconstructed.content || "// (no code captured yet at this point)"}
            language={reconstructed.language}
            readOnly
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-fg-muted">
        {current ? (
          <span>
            <span className="font-medium text-fg">+{formatClock(current.timestampMs - startedAt)}</span>{" "}
            · {describe(current)}
          </span>
        ) : (
          "Session start"
        )}
      </div>

      {/* Timeline with markers */}
      <div className="relative">
        <div className="relative h-7 rounded-md bg-surface-2">
          {events.map((e, i) => {
            const pct = ((e.timestampMs - startedAt) / duration) * 100;
            return (
              <button
                key={i}
                title={`+${formatClock(e.timestampMs - startedAt)} ${e.eventType}`}
                onClick={() => onSeek(e.timestampMs)}
                className={`absolute top-1 h-5 w-[3px] -translate-x-1/2 rounded-full ${MARKER_COLOR[e.eventType] ?? "bg-fg-muted/30"}`}
                style={{ left: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            );
          })}
          <div
            className="absolute top-0 h-7 w-0.5 -translate-x-1/2 bg-fg"
            style={{
              left: `${Math.min(100, Math.max(0, ((timeMs - startedAt) / duration) * 100))}%`,
            }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration}
          value={Math.min(duration, Math.max(0, timeMs - startedAt))}
          onChange={(e) => onSeek(startedAt + Number(e.target.value))}
          className="mt-2 w-full accent-[hsl(var(--accent))]"
        />
        <div className="flex justify-between text-[10px] text-fg-muted">
          <span>0:00</span>
          <span>{formatClock(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function describe(e: SessionEvent): string {
  switch (e.eventType) {
    case "agent_reply":
      return `Tutor hint (Rung ${e.payload.rung}, ${e.payload.objective})`;
    case "agent_request":
      return `Student asked: "${String(e.payload.text ?? "").slice(0, 60)}"`;
    case "hypothesis":
      return `Hypothesis: "${String(e.payload.text ?? "").slice(0, 60)}"`;
    case "error":
      return `Error: ${String(e.payload.message ?? "")}`;
    case "run":
      return `Ran code (exit ${e.payload.exitCode})`;
    case "flag":
      return `Student flagged tutor reply as possible hallucination${e.payload.reason ? `: "${e.payload.reason}"` : ""}`;
    case "paste":
      return e.payload.blocked
        ? `Blocked chat paste (${e.payload.size} chars)`
        : `Pasted ${e.payload.size} chars${e.payload.large ? " (large)" : ""}`;
    case "idle":
      return `Idle for ${Math.round(Number(e.payload.durationMs ?? 0) / 1000)}s`;
    case "task_state":
      return `Task ${e.payload.state}`;
    case "edit":
      return `Editing (${e.payload.length} chars)`;
    default:
      return e.eventType;
  }
}
