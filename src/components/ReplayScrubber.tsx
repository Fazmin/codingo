import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { EditorPane } from "./EditorPane";
import { cn, formatClock } from "../lib/utils";
import type { SessionEvent } from "../lib/types";

const SPEEDS = [1, 3, 5, 10, 20];

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
  // Step in ms for keyboard arrows. Default range step is 1ms, which is
  // imperceptible on a multi-minute timeline; aim for ~1s (clamped to the
  // session length so short sessions stay responsive).
  const step = Math.max(1, Math.min(1000, Math.round(duration / 100)));
  // macOS WebKit will not give keyboard focus to native controls (range,
  // buttons) on click/Tab unless "Full Keyboard Access" is enabled. A focusable
  // wrapper div does receive focus reliably, so we own the keyboard there.
  const containerRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  // Mirrors the playhead so the playback interval reads a live value without
  // re-subscribing on every timeMs change.
  const playPosRef = useRef(timeMs);

  function seekTo(ts: number) {
    const clamped = Math.min(endedAt, Math.max(startedAt, ts));
    playPosRef.current = clamped;
    onSeek(clamped);
  }

  function togglePlay() {
    if (!playing) {
      // Restart from the beginning if we're parked at the end.
      if (playPosRef.current >= endedAt) seekTo(startedAt);
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  }

  // Keep the playback ref in sync with external seeks while paused.
  useEffect(() => {
    if (!playing) playPosRef.current = timeMs;
  }, [timeMs, playing]);

  // Advance the playhead ~10x/sec, scaled by the chosen speed. Stops at the end.
  useEffect(() => {
    if (!playing) return;
    const tickMs = 100;
    const interval = window.setInterval(() => {
      const next = playPosRef.current + tickMs * speed;
      if (next >= endedAt) {
        playPosRef.current = endedAt;
        onSeek(endedAt);
        setPlaying(false);
        return;
      }
      playPosRef.current = next;
      onSeek(next);
    }, tickMs);
    return () => window.clearInterval(interval);
  }, [playing, speed, endedAt, onSeek]);

  // Handle arrows explicitly so seeking is reliable regardless of webview
  // quirks with native range-input keyboard behavior.
  function onSliderKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    let handled = true;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        seekTo(timeMs - step);
        break;
      case "ArrowRight":
      case "ArrowUp":
        seekTo(timeMs + step);
        break;
      case "PageDown":
        seekTo(timeMs - step * 10);
        break;
      case "PageUp":
        seekTo(timeMs + step * 10);
        break;
      case "Home":
        seekTo(startedAt);
        break;
      case "End":
        seekTo(endedAt);
        break;
      case " ":
      case "k":
        togglePlay();
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  }

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

      {/* Playback controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          title={playing ? "Pause (space)" : "Play (space)"}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition-transform hover:opacity-90 active:scale-95"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                speed === s
                  ? "bg-surface text-accent shadow-sm"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {s}x
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs tabular-nums text-fg-muted">
          {formatClock(Math.max(0, timeMs - startedAt))} / {formatClock(duration)}
        </span>
      </div>

      {/* Timeline with markers. The wrapper is the keyboard focus target. */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="slider"
        aria-label="Replay position"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.min(duration, Math.max(0, timeMs - startedAt))}
        onKeyDown={onSliderKeyDown}
        onMouseDown={() => containerRef.current?.focus()}
        className="relative rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <div className="relative h-7 rounded-md bg-surface-2">
          {events.map((e, i) => {
            const pct = ((e.timestampMs - startedAt) / duration) * 100;
            return (
              <button
                key={i}
                tabIndex={-1}
                title={`+${formatClock(e.timestampMs - startedAt)} ${e.eventType}`}
                onClick={() => {
                  seekTo(e.timestampMs);
                  containerRef.current?.focus();
                }}
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
          step={step}
          tabIndex={-1}
          value={Math.min(duration, Math.max(0, timeMs - startedAt))}
          aria-hidden="true"
          onChange={(e) => seekTo(startedAt + Number(e.target.value))}
          className="mt-2 w-full cursor-pointer accent-[hsl(var(--accent))]"
        />
        <div className="flex justify-between text-[10px] text-fg-muted">
          <span>0:00</span>
          <span>{formatClock(duration)}</span>
        </div>
      </div>
      <p className="text-[10px] text-fg-muted/70">
        Tip: click the timeline, then use the arrow keys (Home/End to jump to the ends).
      </p>
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
