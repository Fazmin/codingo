import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Clock,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Spinner,
} from "../components/ui";
import { ObjectiveHeatmap } from "../components/ObjectiveHeatmap";
import { ReplayScrubber } from "../components/ReplayScrubber";
import {
  getCampaign,
  getEvents,
  getReport,
  listCampaigns,
  listSessionsForCampaign,
  saveReport,
} from "../lib/db/database";
import { analyzeSession } from "../lib/ai/analysis";
import { useAppStore } from "../state/appStore";
import { cn, formatClock, formatDate } from "../lib/utils";
import type {
  AnalysisReport,
  Campaign,
  Session,
  SessionEvent,
} from "../lib/types";

export function AnalyzeMode() {
  const targetCampaignId = useAppStore((s) => s.targetCampaignId);
  const targetSessionId = useAppStore((s) => s.targetSessionId);
  const setView = useAppStore((s) => s.setView);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string | null>(targetCampaignId);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Session | null>(null);

  useEffect(() => {
    void listCampaigns().then((cs) => {
      setCampaigns(cs);
      setCampaignId((id) => id ?? cs[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    void getCampaign(campaignId).then(setCampaign);
    void listSessionsForCampaign(campaignId).then(async (ss) => {
      setSessions(ss);
      const map: Record<string, string> = {};
      for (const s of ss) {
        const r = await getReport(s.id);
        if (r) map[s.id] = r.oneLineSummary;
      }
      setSummaries(map);
      const pre = ss.find((s) => s.id === targetSessionId) ?? ss[0] ?? null;
      setSelected(pre);
    });
  }, [campaignId, targetSessionId]);

  if (campaigns.length === 0) {
    return (
      <>
        <PageHeader title="Analyze" subtitle="Review recorded sessions." />
        <div className="flex-1">
          <EmptyState
            icon={<BarChart3 size={22} />}
            title="Nothing to analyze yet"
            description="Author a campaign and run a session in Learn mode to generate data."
            action={
              <Button variant="primary" onClick={() => setView("author")}>
                Go to Author
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analyze"
        subtitle="Review the process behind each session, verified against the replay."
        actions={
          <Select
            className="w-56"
            value={campaignId ?? ""}
            onChange={(e) => {
              setCampaignId(e.target.value);
              setSelected(null);
            }}
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        }
      />
      <div className="flex min-h-0 flex-1">
        <SessionList
          sessions={sessions}
          summaries={summaries}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
        <div className="min-w-0 flex-1 overflow-y-auto">
          {selected && campaign ? (
            <SessionReport
              key={selected.id}
              session={selected}
              campaign={campaign}
              onSummary={(sum) =>
                setSummaries((m) => ({ ...m, [selected.id]: sum }))
              }
            />
          ) : (
            <EmptyState
              icon={<BarChart3 size={22} />}
              title="No session selected"
              description="Pick a session from the list to view its report and replay."
            />
          )}
        </div>
      </div>
    </>
  );
}

function SessionList({
  sessions,
  summaries,
  selectedId,
  onSelect,
}: {
  sessions: Session[];
  summaries: Record<string, string>;
  selectedId: string | null;
  onSelect: (s: Session) => void;
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-border bg-surface/40">
      <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        Sessions ({sessions.length})
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 ? (
          <div className="px-3 py-2 text-sm text-fg-muted/70">
            No sessions for this campaign yet.
          </div>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={cn(
                "mb-1 w-full rounded-lg px-3 py-2 text-left transition-colors",
                selectedId === s.id ? "bg-accent/10" : "hover:bg-surface-2",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-fg">{s.studentId}</span>
                {s.accommodated && <Badge tone="warning">accom.</Badge>}
              </div>
              <div className="truncate text-xs text-fg-muted">
                {summaries[s.id] ?? formatDate(s.startedAt)}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function SessionReport({
  session,
  campaign,
  onSummary,
}: {
  session: Session;
  campaign: Campaign;
  onSummary: (summary: string) => void;
}) {
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replayTime, setReplayTime] = useState(session.startedAt);

  const endedAt = useMemo(() => {
    if (session.endedAt) return session.endedAt;
    const last = events[events.length - 1];
    return last ? last.timestampMs : session.startedAt + 1000;
  }, [session, events]);

  useEffect(() => {
    setReplayTime(session.startedAt);
    void getEvents(session.id).then(setEvents);
    void getReport(session.id).then(setReport);
  }, [session.id, session.startedAt]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const r = await analyzeSession(campaign, events, session.startedAt);
      await saveReport(session.id, r);
      setReport(r);
      onSummary(r.oneLineSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  const eventCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of events) c[e.eventType] = (c[e.eventType] ?? 0) + 1;
    return c;
  }, [events]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-7 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-fg">
            {session.studentId}
          </h2>
          <p className="text-sm text-fg-muted">
            {formatDate(session.startedAt)} · {events.length} events ·{" "}
            {session.status}
          </p>
        </div>
        <Button variant="primary" onClick={generate} disabled={generating || events.length === 0}>
          {generating ? <Spinner /> : <Sparkles size={16} />}
          {report ? "Regenerate" : "Generate analysis"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(eventCounts).map(([k, v]) => (
          <Badge key={k}>
            {k} · {v}
          </Badge>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {report ? (
        <>
          <Card className="p-5">
            <h3 className="mb-2 text-sm font-semibold text-fg">Narrative</h3>
            <p className="text-sm leading-relaxed text-fg">{report.narrative}</p>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-fg">
              Objective scaffolding heat-map
            </h3>
            <ObjectiveHeatmap rows={report.perObjective} />
          </Card>

          {report.notableQuestions.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
                <HelpCircle size={15} /> Notable questions
              </h3>
              <ul className="flex flex-col gap-2">
                {report.notableQuestions.map((q, i) => (
                  <li
                    key={i}
                    className="rounded-md bg-surface-2 px-3 py-2 text-sm text-fg"
                  >
                    "{q}"
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {report.attentionMoments.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-1 text-sm font-semibold text-fg">
                Moments worth attention
              </h3>
              <p className="mb-3 text-xs text-fg-muted">
                Every claim links to the exact moment in the replay below. Click to
                verify.
              </p>
              <ul className="flex flex-col gap-2">
                {report.attentionMoments.map((m, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <button
                      onClick={() => setReplayTime(m.timestampMs)}
                      className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/20"
                    >
                      <Clock size={11} /> +{formatClock(m.timestampMs - session.startedAt)}
                    </button>
                    <span className="text-sm text-fg">{m.note}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-5">
          <p className="text-sm text-fg-muted">
            No analysis generated yet. Click <strong>Generate analysis</strong> to
            produce a report from the {events.length}-event log. The report links
            every claim to a replay timestamp so you can verify it.
          </p>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="mb-1 text-sm font-semibold text-fg">Replay</h3>
        <p className="mb-3 text-xs text-fg-muted">
          Scrub the timeline to watch the workspace evolve. Markers show events;
          click any marker or an attention moment above to jump.
        </p>
        {events.length > 0 ? (
          <ReplayScrubber
            events={events}
            startedAt={session.startedAt}
            endedAt={endedAt}
            timeMs={replayTime}
            onSeek={setReplayTime}
          />
        ) : (
          <p className="text-sm text-fg-muted/70">No events recorded.</p>
        )}
      </Card>
    </div>
  );
}
