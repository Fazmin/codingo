import { useEffect, useRef, useState } from "react";
import { Lock, X } from "lucide-react";
import { Button } from "./ui";
import { useAppStore } from "../state/appStore";
import { cn } from "../lib/utils";

export function UnlockDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const lockPin = useAppStore((s) => s.settings.lockPin);
  const setLocked = useAppStore((s) => s.setLocked);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  function submit(code: string) {
    if (code === lockPin && lockPin.length === 4) {
      setLocked(false);
      onClose();
    } else {
      setError(true);
      setValue("");
      setTimeout(() => setError(false), 600);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div
        className={cn(
          "w-full max-w-xs rounded-xl border border-border bg-surface p-6 card-shadow",
          error && "animate-[fade-in_0.1s]",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Lock size={16} /> Enter unlock code
          </div>
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mb-4 text-xs text-fg-muted">
          This session is locked. Enter the 4-digit code to leave the workspace.
        </p>
        <input
          ref={inputRef}
          inputMode="numeric"
          pattern="\d*"
          maxLength={4}
          value={value}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 4);
            setValue(next);
            if (next.length === 4) submit(next);
          }}
          className={cn(
            "h-14 w-full rounded-lg border bg-surface-2 text-center text-2xl tracking-[0.6em] text-fg focus:outline-none focus:ring-2",
            error
              ? "border-danger ring-danger/30 animate-pulse"
              : "border-border focus:border-accent focus:ring-accent/30",
          )}
          placeholder="••••"
        />
        {error && (
          <p className="mt-2 text-center text-xs text-danger">
            Incorrect code. Try again.
          </p>
        )}
        <Button
          variant="primary"
          className="mt-4 w-full justify-center"
          disabled={value.length !== 4}
          onClick={() => submit(value)}
        >
          Unlock
        </Button>
      </div>
    </div>
  );
}
