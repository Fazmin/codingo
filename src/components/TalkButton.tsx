import { useState } from "react";
import { Accessibility, Loader2, Mic, Send, Square, Volume2 } from "lucide-react";
import { Button, Input } from "./ui";
import { cn } from "../lib/utils";

export type AgentState =
  | "idle"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking";

const STATE_LABEL: Record<AgentState, string> = {
  idle: "Hold to talk",
  recording: "Listening... release to send",
  transcribing: "Transcribing...",
  thinking: "Thinking...",
  speaking: "Speaking...",
};

interface TalkButtonProps {
  state: AgentState;
  accommodated: boolean;
  disabled?: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTypedSubmit: (text: string) => void;
  onToggleAccommodated: (v: boolean) => void;
}

export function TalkButton({
  state,
  accommodated,
  disabled,
  onStartRecording,
  onStopRecording,
  onTypedSubmit,
  onToggleAccommodated,
}: TalkButtonProps) {
  const [typed, setTyped] = useState("");
  const busy = state === "transcribing" || state === "thinking";

  return (
    <div className="border-t border-border p-4">
      {accommodated ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) {
              onTypedSubmit(typed.trim());
              setTyped("");
            }
          }}
        >
          <Input
            value={typed}
            disabled={busy || disabled}
            placeholder="Type your question to the tutor..."
            onChange={(e) => setTyped(e.target.value)}
          />
          <Button type="submit" variant="primary" size="icon" disabled={busy || disabled}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button
            disabled={disabled || busy || state === "speaking"}
            onMouseDown={onStartRecording}
            onMouseUp={onStopRecording}
            onMouseLeave={() => state === "recording" && onStopRecording()}
            className={cn(
              "relative flex h-16 w-16 items-center justify-center rounded-full transition-all disabled:opacity-50",
              state === "recording"
                ? "bg-danger text-white scale-105"
                : "bg-accent text-accent-fg hover:opacity-90 active:scale-95",
            )}
          >
            {state === "recording" && (
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-danger/40" />
            )}
            {state === "transcribing" || state === "thinking" ? (
              <Loader2 size={24} className="animate-spin" />
            ) : state === "speaking" ? (
              <Volume2 size={24} />
            ) : state === "recording" ? (
              <Square size={22} />
            ) : (
              <Mic size={24} />
            )}
          </button>
          <span className="text-xs text-fg-muted">{STATE_LABEL[state]}</span>
        </div>
      )}

      <button
        onClick={() => onToggleAccommodated(!accommodated)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 text-[11px] text-fg-muted/80 hover:text-fg"
        title="Switch between voice and typed input"
      >
        <Accessibility size={13} />
        {accommodated ? "Using typed input (accommodated)" : "Switch to typed input"}
      </button>
    </div>
  );
}
