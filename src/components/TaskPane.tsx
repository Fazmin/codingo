import { BookOpen, Clock, Globe, ShieldCheck, Target } from "lucide-react";
import { Badge } from "./ui";
import type { Campaign } from "../lib/types";

const DISCLOSURE_TONE: Record<string, "danger" | "warning" | "success"> = {
  strict: "danger",
  balanced: "warning",
  permissive: "success",
};

export function TaskPane({ campaign }: { campaign: Campaign }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-fg">{campaign.title}</h2>
        {campaign.description && (
          <p className="mt-1 text-sm text-fg-muted">{campaign.description}</p>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Badge tone={DISCLOSURE_TONE[campaign.disclosure.default]}>
          <ShieldCheck size={12} />
          {campaign.disclosure.default} disclosure
        </Badge>
        {campaign.timeBudgetMin && (
          <Badge>
            <Clock size={12} />
            {campaign.timeBudgetMin} min
          </Badge>
        )}
        {campaign.allowedResources.languageDocs && (
          <Badge>
            <BookOpen size={12} />
            Docs on
          </Badge>
        )}
        <Badge tone={campaign.allowedResources.openWeb ? "warning" : "default"}>
          <Globe size={12} />
          Web {campaign.allowedResources.openWeb ? "on" : "off"}
        </Badge>
      </div>

      <section className="mb-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          Task
        </h3>
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm leading-relaxed text-fg whitespace-pre-wrap">
          {campaign.taskPrompt || "No task prompt provided."}
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          <Target size={13} /> Learning objectives
        </h3>
        {campaign.objectives.length === 0 ? (
          <p className="text-sm text-fg-muted/70">None defined.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {campaign.objectives.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-1.5 text-sm text-fg"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {o.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
