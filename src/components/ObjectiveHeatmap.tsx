import { Badge } from "./ui";
import { cn, rungLabel } from "../lib/utils";
import type { ObjectiveOutcome } from "../lib/types";

const FILL = [
  "bg-accent/20",
  "bg-accent/35",
  "bg-accent/55",
  "bg-accent/75",
  "bg-accent",
];

const TRANSFER_TONE: Record<string, "success" | "warning" | "default"> = {
  demonstrated: "success",
  partial: "warning",
  "not-observed": "default",
};

export function ObjectiveHeatmap({ rows }: { rows: ObjectiveOutcome[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-fg-muted/70">No objectives recorded for this session.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pl-[34%] text-[10px] font-medium uppercase tracking-wide text-fg-muted">
        {[0, 1, 2, 3, 4].map((r) => (
          <div key={r} className="w-9 text-center" title={rungLabel(r)}>
            R{r}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.objective} className="flex items-center gap-3">
          <div className="w-[32%] truncate text-sm font-medium text-fg" title={row.objective}>
            {row.objective}
          </div>
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3, 4].map((r) => (
              <div
                key={r}
                title={`Rung ${r}: ${rungLabel(r)}`}
                className={cn(
                  "h-8 w-9 rounded-md border border-border/50 transition-colors",
                  r <= row.maxRung ? FILL[r] : "bg-surface-2",
                )}
              />
            ))}
          </div>
          <Badge tone={TRANSFER_TONE[row.transfer]}>{row.transfer}</Badge>
        </div>
      ))}
    </div>
  );
}
