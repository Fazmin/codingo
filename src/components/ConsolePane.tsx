import { Play, Terminal, Trash2 } from "lucide-react";
import { Button, Spinner } from "./ui";
import { cn } from "../lib/utils";

export interface ConsoleLine {
  kind: "stdout" | "stderr" | "meta";
  text: string;
}

interface ConsolePaneProps {
  lines: ConsoleLine[];
  running: boolean;
  onRun: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function ConsolePane({
  lines,
  running,
  onRun,
  onClear,
  disabled,
}: ConsolePaneProps) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-fg-muted">
          <Terminal size={14} />
          Console
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={onClear} title="Clear console">
            <Trash2 size={14} />
          </Button>
          <Button size="sm" variant="primary" onClick={onRun} disabled={running || disabled}>
            {running ? <Spinner /> : <Play size={14} />}
            Run
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
        {lines.length === 0 ? (
          <div className="text-fg-muted/60">
            Output will appear here. Press Run to execute your code.
          </div>
        ) : (
          lines.map((l, i) => (
            <pre
              key={i}
              className={cn(
                "whitespace-pre-wrap break-words",
                l.kind === "stderr" && "text-danger",
                l.kind === "meta" && "text-fg-muted/70 italic",
                l.kind === "stdout" && "text-fg",
              )}
            >
              {l.text}
            </pre>
          ))
        )}
      </div>
    </div>
  );
}
