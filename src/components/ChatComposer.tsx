import { useState } from "react";
import { ClipboardX, Loader2, Send } from "lucide-react";
import { Button } from "./ui";
import { cn } from "../lib/utils";

interface ChatComposerProps {
  busy: boolean;
  disabled?: boolean;
  onSubmit: (text: string) => void;
  /** Called when the student attempts to paste (which is blocked in Lab mode). */
  onPasteBlocked: (attemptedSize: number) => void;
}

/** Typed tutor input for Lab mode. Pasting is deliberately disabled. */
export function ChatComposer({
  busy,
  disabled,
  onSubmit,
  onPasteBlocked,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [pasteWarning, setPasteWarning] = useState(false);

  function send() {
    const trimmed = text.trim();
    if (!trimmed || busy || disabled) return;
    onSubmit(trimmed);
    setText("");
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    const attempted = e.clipboardData.getData("text").length;
    onPasteBlocked(attempted);
    setPasteWarning(true);
    window.setTimeout(() => setPasteWarning(false), 2500);
  }

  return (
    <div className="border-t border-border p-3">
      {pasteWarning && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
          <ClipboardX size={13} />
          Pasting is disabled in Lab mode. Type your question.
        </div>
      )}
      <div
        className={cn(
          "flex items-end gap-2 rounded-lg border bg-surface-2 p-1.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30",
          pasteWarning ? "border-warning/50" : "border-border",
        )}
      >
        <textarea
          value={text}
          rows={2}
          disabled={disabled}
          placeholder="Type your question to the tutor..."
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          onDrop={(e) => {
            e.preventDefault();
            onPasteBlocked(0);
            setPasteWarning(true);
            window.setTimeout(() => setPasteWarning(false), 2500);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-fg placeholder:text-fg-muted/70 focus:outline-none"
        />
        <Button
          variant="primary"
          size="icon"
          disabled={busy || disabled || !text.trim()}
          onClick={send}
          title="Send (Enter)"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </div>
      <p className="mt-2 text-center text-[11px] text-fg-muted/70">
        Lab mode · text only · pasting disabled
      </p>
    </div>
  );
}
