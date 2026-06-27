import { useEffect, useRef } from "react";
import { Lightbulb, MessageCircle } from "lucide-react";
import { Badge } from "./ui";
import { cn, rungLabel } from "../lib/utils";

export interface Turn {
  role: "student" | "tutor" | "hypothesis" | "system";
  text: string;
  rung?: number;
  objective?: string;
}

export function TranscriptPanel({ turns }: { turns: Turn[] }) {
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
            Hold the Talk button and ask the tutor a question. It will guide, not
            answer.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {turns.map((t, i) => (
            <TurnBubble key={i} turn={t} />
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}

function TurnBubble({ turn }: { turn: Turn }) {
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
  return (
    <div
      className={cn(
        "max-w-[85%]",
        isStudent ? "self-end" : "self-start",
      )}
    >
      <div
        className={cn(
          "rounded-xl px-3 py-2 text-sm",
          isStudent
            ? "rounded-br-sm bg-accent text-accent-fg"
            : "rounded-bl-sm border border-border bg-surface-2 text-fg",
        )}
      >
        {turn.text}
      </div>
      {!isStudent && turn.rung !== undefined && (
        <div className="mt-1 flex items-center gap-1.5">
          <Badge tone="accent">Rung {turn.rung} · {rungLabel(turn.rung)}</Badge>
          {turn.objective && <Badge>{turn.objective}</Badge>}
        </div>
      )}
    </div>
  );
}
