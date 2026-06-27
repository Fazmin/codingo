import { useEffect, useRef, useState } from "react";
import { Flag, Lightbulb, MessageCircle, X } from "lucide-react";
import { Badge, Button } from "./ui";
import { cn, rungLabel } from "../lib/utils";

export interface Turn {
  role: "student" | "tutor" | "hypothesis" | "system";
  text: string;
  rung?: number;
  objective?: string;
  flagged?: boolean;
}

export function TranscriptPanel({
  turns,
  mode = "voice",
  onFlag,
}: {
  turns: Turn[];
  mode?: "voice" | "text";
  onFlag?: (index: number, reason: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {turns.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-fg-muted">
          <MessageCircle size={22} className="opacity-50" />
          <p className="max-w-[200px] text-xs">
            {mode === "text"
              ? "Type a question to the tutor below. It will guide, not answer."
              : "Hold the Talk button and ask the tutor a question. It will guide, not answer."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {turns.map((t, i) => (
            <TurnBubble
              key={i}
              turn={t}
              onFlag={onFlag ? (reason) => onFlag(i, reason) : undefined}
            />
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}

function TurnBubble({
  turn,
  onFlag,
}: {
  turn: Turn;
  onFlag?: (reason: string) => void;
}) {
  const [flagging, setFlagging] = useState(false);
  const [reason, setReason] = useState("");

  if (turn.role === "system") {
    return (
      <div className="text-center text-xs text-fg-muted/70 italic">{turn.text}</div>
    );
  }
  if (turn.role === "hypothesis") {
    return (
      <div className="self-end max-w-[85%] rounded-xl rounded-br-sm border border-warning/30 bg-warning/10 px-3 py-2">
        <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-warning">
          <Lightbulb size={11} /> Hypothesis
        </div>
        <p className="text-sm text-fg">{turn.text}</p>
      </div>
    );
  }
  const isStudent = turn.role === "student";
  const canFlag = !isStudent && !!onFlag && turn.rung !== undefined;

  return (
    <div className={cn("max-w-[85%]", isStudent ? "self-end" : "self-start")}>
      <div
        className={cn(
          "rounded-xl px-3 py-2 text-sm",
          isStudent
            ? "rounded-br-sm bg-accent text-accent-fg"
            : turn.flagged
              ? "rounded-bl-sm border border-danger/40 bg-danger/10 text-fg"
              : "rounded-bl-sm border border-border bg-surface-2 text-fg",
        )}
      >
        {turn.text}
      </div>
      {!isStudent && turn.rung !== undefined && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone="accent">Rung {turn.rung} · {rungLabel(turn.rung)}</Badge>
          {turn.objective && <Badge>{turn.objective}</Badge>}
          {turn.flagged ? (
            <Badge tone="danger">
              <Flag size={11} /> Flagged: possible hallucination
            </Badge>
          ) : (
            canFlag &&
            !flagging && (
              <button
                onClick={() => setFlagging(true)}
                className="inline-flex items-center gap-1 text-[11px] text-fg-muted/70 hover:text-danger"
                title="Flag this reply as a possible hallucination"
              >
                <Flag size={11} /> Flag
              </button>
            )
          )}
        </div>
      )}

      {canFlag && flagging && !turn.flagged && (
        <div className="mt-2 rounded-lg border border-danger/30 bg-danger/5 p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-danger">
              Flag as possible hallucination
            </span>
            <button
              onClick={() => {
                setFlagging(false);
                setReason("");
              }}
              className="text-fg-muted hover:text-fg"
              aria-label="Cancel"
            >
              <X size={13} />
            </button>
          </div>
          <input
            value={reason}
            autoFocus
            placeholder="Optional: what seems wrong?"
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onFlag?.(reason.trim());
                setFlagging(false);
              }
            }}
            className="mb-2 h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-fg placeholder:text-fg-muted/60 focus:border-danger focus:outline-none"
          />
          <Button
            size="sm"
            variant="danger"
            className="w-full justify-center"
            onClick={() => {
              onFlag?.(reason.trim());
              setFlagging(false);
            }}
          >
            <Flag size={12} /> Submit flag
          </Button>
        </div>
      )}
    </div>
  );
}
