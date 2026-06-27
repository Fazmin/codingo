import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Clock,
  FileCode2,
  Flag,
  FlaskConical,
  GraduationCap,
  Lock,
  Play,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Toggle,
} from "../components/ui";
import { EditorPane, type CursorPos } from "../components/EditorPane";
import { ConsolePane, type ConsoleLine } from "../components/ConsolePane";
import { TaskPane } from "../components/TaskPane";
import { TranscriptPanel, type Turn } from "../components/TranscriptPanel";
import { TalkButton, type AgentState } from "../components/TalkButton";
import { ChatComposer } from "../components/ChatComposer";
import {
  createSession,
  getCampaign,
  listCampaigns,
  updateSessionStatus,
} from "../lib/db/database";
import { useEventLogger } from "../lib/capture/useEventLogger";
import { Recorder } from "../lib/voice/record";
import { transcribeAudio } from "../lib/voice/transcribe";
import { speak, stopSpeaking } from "../lib/voice/speak";
import { runSocraticTurn, type SocraticTurn } from "../lib/ai/socratic";
import { runCode, parseError } from "../lib/run";
import { useAppStore } from "../state/appStore";
import { cn, formatClock } from "../lib/utils";
import type { Campaign, Session, StarterFile } from "../lib/types";

export function LearnMode() {
  const targetCampaignId = useAppStore((s) => s.targetCampaignId);
  const settings = useAppStore((s) => s.settings);
  const goToAnalyze = useAppStore((s) => s.goToAnalyze);
  const setLocked = useAppStore((s) => s.setLocked);
  const locked = useAppStore((s) => s.locked);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [accommodated, setAccommodated] = useState(false);
  const [interaction, setInteraction] = useState<"voice" | "text">("voice");

  // workspace state
  const [files, setFiles] = useState<StarterFile[]>([]);
  const [activeFile, setActiveFile] = useState(0);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [running, setRunning] = useState(false);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // agent state
  const [turns, setTurns] = useState<Turn[]>([]);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [agentError, setAgentError] = useState<string | null>(null);

  const logger = useEventLogger(session);
  const recorderRef = useRef<Recorder | null>(null);
  const editTimer = useRef<number | null>(null);

  // gating refs
  const historyRef = useRef<SocraticTurn[]>([]);
  const lastRungRef = useRef<number | null>(null);
  const attemptedRef = useRef<boolean>(false);
  const heardHypothesisRef = useRef<boolean>(false);
  const awaitingHypothesisRef = useRef<boolean>(false);

  // Resolve target campaign chosen from Author / Analyze.
  useEffect(() => {
    if (!targetCampaignId || session) return;
    void getCampaign(targetCampaignId).then((c) => {
      if (c) setCampaign(c);
    });
  }, [targetCampaignId, session]);

  // Session timer.
  useEffect(() => {
    if (!session || session.status === "submitted") return;
    const t = window.setInterval(
      () => setElapsed(Date.now() - session.startedAt),
      1000,
    );
    return () => window.clearInterval(t);
  }, [session]);

  // Pause/resume capture on window focus changes.
  useEffect(() => {
    if (!session || session.status === "submitted") return;
    const onBlur = () => logger.log("task_state", { state: "paused" });
    const onFocus = () => logger.log("task_state", { state: "resumed" });
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [session, logger]);

  async function startSession(
    c: Campaign,
    opts: { lock?: boolean; interaction?: "voice" | "text" } = {},
  ) {
    const mode = opts.interaction ?? "voice";
    const s = await createSession(c.id, settings.studentId, accommodated);
    setCampaign(c);
    setSession(s);
    setInteraction(mode);
    if (opts.lock) setLocked(true);
    setFiles(c.starterFiles.length ? structuredClone(c.starterFiles) : [
      { name: "main.py", language: "python", content: "" },
    ]);
    setActiveFile(0);
    setTurns([]);
    historyRef.current = [];
    lastRungRef.current = null;
    attemptedRef.current = false;
    heardHypothesisRef.current = false;
    awaitingHypothesisRef.current = false;
    // task_state started, logged against the new session directly.
    void import("../lib/db/database").then((m) =>
      m.appendEvent({
        sessionId: s.id,
        campaignId: s.campaignId,
        studentId: s.studentId,
        timestampMs: Date.now(),
        eventType: "task_state",
        payload: { state: "started", mode },
      }),
    );
  }

  function file(): StarterFile | undefined {
    return files[activeFile];
  }

  function onEditorChange(value: string, cursor: CursorPos) {
    setFiles((fs) => {
      const next = [...fs];
      if (next[activeFile]) next[activeFile] = { ...next[activeFile], content: value };
      return next;
    });
    attemptedRef.current = true;
    logger.noteActivity();
    if (editTimer.current) window.clearTimeout(editTimer.current);
    const f = files[activeFile];
    editTimer.current = window.setTimeout(() => {
      logger.log("edit", {
        file: f?.name,
        length: value.length,
        line: cursor.line,
        column: cursor.column,
        snapshot: value,
      });
    }, 700);
  }

  function onPaste(size: number) {
    logger.log("paste", { size, large: size > 200, file: file()?.name });
    logger.noteActivity();
  }

  // Lab mode blocks chat pasting; record the attempt as an integrity signal.
  function onChatPasteBlocked(size: number) {
    logger.log("paste", { target: "chat", blocked: true, size });
    logger.noteActivity();
  }

  function handleFlag(index: number, reason: string) {
    const turn = turns[index];
    if (!turn || turn.role !== "tutor") return;
    logger.log("flag", {
      target: "agent_reply",
      text: turn.text,
      rung: turn.rung,
      objective: turn.objective,
      reason,
    });
    setTurns((ts) =>
      ts.map((t, i) => (i === index ? { ...t, flagged: true } : t)),
    );
  }

  async function handleRun() {
    const f = file();
    if (!f) return;
    setRunning(true);
    setErrorLine(null);
    attemptedRef.current = true;
    logger.noteActivity();
    setConsoleLines((l) => [
      ...l,
      { kind: "meta", text: `$ run ${f.name}` },
    ]);
    const res = await runCode(f.language, f.content);
    logger.log("run", {
      language: f.language,
      file: f.name,
      exitCode: res.exit_code,
      durationMs: res.duration_ms,
    });
    const out: ConsoleLine[] = [];
    if (res.error) out.push({ kind: "stderr", text: res.error });
    if (res.stdout) out.push({ kind: "stdout", text: res.stdout });
    if (res.stderr) out.push({ kind: "stderr", text: res.stderr });
    out.push({
      kind: "meta",
      text: `[exit ${res.exit_code} · ${res.duration_ms}ms]`,
    });
    setConsoleLines((l) => [...l, ...out]);

    if (res.stdout || res.stderr) {
      logger.log("output", {
        stdout: res.stdout.slice(0, 4000),
        stderr: res.stderr.slice(0, 4000),
      });
    }
    if (res.stderr) {
      const parsed = parseError(f.language, res.stderr);
      if (parsed) {
        logger.log("error", { message: parsed.message, line: parsed.line });
        setErrorLine(parsed.line);
      }
    }
    setRunning(false);
  }

  // ---- Agent interaction ----

  async function handleUtterance(text: string) {
    if (!campaign || !text.trim()) return;
    setAgentError(null);

    // If the tutor just asked for a hypothesis, record this as one.
    if (awaitingHypothesisRef.current && !heardHypothesisRef.current) {
      heardHypothesisRef.current = true;
      awaitingHypothesisRef.current = false;
      logger.log("hypothesis", { text });
      setTurns((t) => [...t, { role: "hypothesis", text }]);
    } else {
      setTurns((t) => [...t, { role: "student", text }]);
    }
    logger.log("agent_request", { text });

    setAgentState("thinking");
    try {
      const f = file();
      const codeContext = f
        ? `File ${f.name} (${f.language}):\n${f.content}${
            errorLine ? `\n\n[Most recent error is on line ${errorLine}]` : ""
          }`
        : undefined;

      const result = await runSocraticTurn({
        campaign,
        history: historyRef.current,
        studentUtterance: text,
        lastRung: lastRungRef.current,
        attemptedSinceLastHint: attemptedRef.current,
        heardHypothesis: heardHypothesisRef.current,
        codeContext,
      });

      historyRef.current = [
        ...historyRef.current,
        { role: "user", content: text },
        { role: "assistant", content: result.reply },
      ];
      lastRungRef.current = result.rung;
      attemptedRef.current = false;
      awaitingHypothesisRef.current = result.askedForHypothesis;

      logger.log("agent_reply", {
        text: result.reply,
        rung: result.rung,
        objective: result.objective,
      });
      setTurns((t) => [
        ...t,
        {
          role: "tutor",
          text: result.reply,
          rung: result.rung,
          objective: result.objective,
        },
      ]);

      if (interaction === "voice") {
        setAgentState("speaking");
        await speak(result.reply);
      }
    } catch (e) {
      setAgentError(e instanceof Error ? e.message : String(e));
      setTurns((t) => [
        ...t,
        { role: "system", text: "The tutor could not respond. Check your API key in Settings." },
      ]);
    } finally {
      setAgentState("idle");
    }
  }

  async function startRecording() {
    if (!settings.model.openaiKey) {
      setAgentError("Add an OpenAI key in Settings to use voice.");
      return;
    }
    setAgentError(null);
    stopSpeaking();
    const rec = new Recorder();
    recorderRef.current = rec;
    try {
      await rec.start();
      setAgentState("recording");
    } catch (e) {
      setAgentError(
        e instanceof Error ? e.message : "Microphone unavailable.",
      );
      setAgentState("idle");
    }
  }

  async function stopRecording() {
    const rec = recorderRef.current;
    if (!rec || agentState !== "recording") return;
    setAgentState("transcribing");
    try {
      const blob = await rec.stop();
      const text = await transcribeAudio(blob);
      if (text.trim()) {
        await handleUtterance(text);
      } else {
        setAgentState("idle");
      }
    } catch (e) {
      setAgentError(e instanceof Error ? e.message : "Transcription failed.");
      setAgentState("idle");
    } finally {
      recorderRef.current = null;
    }
  }

  async function submitSession() {
    if (!session) return;
    stopSpeaking();
    logger.log("task_state", { state: "submitted" });
    await updateSessionStatus(session.id, "submitted", true);
    const done = { ...session, status: "submitted" as const, endedAt: Date.now() };
    setSession(done);
  }

  // ---- Render ----

  if (!session) {
    return <Launcher onStart={startSession} accommodated={accommodated} setAccommodated={setAccommodated} preselectId={campaign?.id ?? targetCampaignId} />;
  }

  const overBudget =
    campaign?.timeBudgetMin != null &&
    elapsed > campaign.timeBudgetMin * 60_000;
  const submitted = session.status === "submitted";
  const f = file();

  return (
    <>
      <PageHeader
        title={campaign?.title ?? "Session"}
        subtitle={`Student: ${session.studentId}${session.accommodated ? " · accommodated" : ""}`}
        actions={
          <>
            {locked && (
              <Badge tone="warning">
                <Lock size={12} /> Locked
              </Badge>
            )}
            <Badge tone={overBudget ? "danger" : "default"}>
              <Clock size={12} /> {formatClock(elapsed)}
              {campaign?.timeBudgetMin ? ` / ${campaign.timeBudgetMin}:00` : ""}
            </Badge>
            {submitted ? (
              locked ? (
                <Badge tone="default">Submitted · ask instructor to unlock</Badge>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => session && goToAnalyze(session.campaignId, session.id)}
                >
                  <GraduationCap size={16} /> View analysis
                </Button>
              )
            ) : (
              <Button variant="primary" onClick={submitSession}>
                <Flag size={16} /> Submit
              </Button>
            )}
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        {/* Task pane */}
        <div className="w-72 shrink-0 border-r border-border bg-surface/40">
          {campaign && <TaskPane campaign={campaign} />}
        </div>

        {/* Editor + console */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1 border-b border-border bg-surface-2/40 px-2 py-1.5">
            <FileCode2 size={14} className="ml-1 text-fg-muted" />
            {files.map((file, i) => (
              <button
                key={i}
                onClick={() => setActiveFile(i)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  i === activeFile
                    ? "bg-surface text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                {file.name}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {f && (
              <EditorPane
                value={f.content}
                language={f.language}
                onChange={onEditorChange}
                onPaste={onPaste}
                errorLine={errorLine}
                readOnly={submitted}
              />
            )}
          </div>
          <div className="h-52 border-t border-border">
            <ConsolePane
              lines={consoleLines}
              running={running}
              disabled={submitted}
              onRun={handleRun}
              onClear={() => setConsoleLines([])}
            />
          </div>
        </div>

        {/* Agent */}
        <div className="flex w-80 shrink-0 flex-col border-l border-border bg-surface/40">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-sm font-semibold text-fg">Socratic tutor</div>
            {interaction === "text" ? (
              <Badge tone="accent">
                <FlaskConical size={11} /> Lab (text)
              </Badge>
            ) : (
              <Badge tone="accent">voice</Badge>
            )}
          </div>
          {agentError && (
            <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {agentError}
            </div>
          )}
          <TranscriptPanel turns={turns} mode={interaction} onFlag={handleFlag} />
          {!submitted &&
            (interaction === "text" ? (
              <ChatComposer
                busy={agentState === "thinking"}
                disabled={!campaign}
                onSubmit={handleUtterance}
                onPasteBlocked={onChatPasteBlocked}
              />
            ) : (
              <TalkButton
                state={agentState}
                accommodated={session.accommodated || accommodated}
                disabled={!campaign}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onTypedSubmit={handleUtterance}
                onToggleAccommodated={setAccommodated}
              />
            ))}
        </div>
      </div>
    </>
  );
}

function Launcher({
  onStart,
  accommodated,
  setAccommodated,
  preselectId,
}: {
  onStart: (
    c: Campaign,
    opts?: { lock?: boolean; interaction?: "voice" | "text" },
  ) => void;
  accommodated: boolean;
  setAccommodated: (v: boolean) => void;
  preselectId?: string | null;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const setView = useAppStore((s) => s.setView);
  const lockPin = useAppStore((s) => s.settings.lockPin);
  const pinReady = lockPin.length === 4;

  useEffect(() => {
    void listCampaigns()
      .then((cs) => {
        setCampaigns(cs);
        const pre = cs.find((c) => c.id === preselectId);
        setSelected(pre ?? cs[0] ?? null);
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, [preselectId]);

  return (
    <>
      <PageHeader
        title="Learn"
        subtitle="Pick a campaign and start a focused, recorded session."
      />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        {loading ? (
          <p className="text-sm text-fg-muted">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={<GraduationCap size={22} />}
            title="No campaigns to run"
            description="Create a campaign in Author mode first, then come back to run it."
            action={
              <Button variant="primary" onClick={() => setView("author")}>
                Go to Author
              </Button>
            }
          />
        ) : (
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_280px]">
            <div className="flex flex-col gap-2">
              {campaigns.map((c) => (
                <Card
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={cn(
                    "cursor-pointer p-4 transition-all",
                    selected?.id === c.id
                      ? "ring-2 ring-accent"
                      : "hover:border-fg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-fg">{c.title}</h3>
                    <Badge tone="warning">{c.disclosure.default}</Badge>
                  </div>
                  {c.description && (
                    <p className="mt-1 text-sm text-fg-muted line-clamp-2">
                      {c.description}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Badge tone="accent">{c.objectives.length} objectives</Badge>
                    <Badge>{c.starterFiles.length} files</Badge>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="h-fit p-5">
              <h3 className="text-sm font-semibold text-fg">Start session</h3>
              <p className="mt-1 text-xs text-fg-muted">
                {selected ? selected.title : "Select a campaign"}
              </p>
              <div className="my-4 flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div>
                  <div className="text-sm text-fg">Accessibility mode</div>
                  <div className="text-xs text-fg-muted">
                    Type instead of speaking. Flags the session as accommodated.
                  </div>
                </div>
                <Toggle checked={accommodated} onChange={setAccommodated} />
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center"
                disabled={!selected}
                onClick={() => selected && onStart(selected)}
              >
                <Play size={16} /> Begin
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="mt-2 w-full justify-center"
                disabled={!selected}
                title="Lab mode: chat with the tutor by typing. Voice is off and pasting into the chat is disabled."
                onClick={() => selected && onStart(selected, { interaction: "text" })}
              >
                <FlaskConical size={16} /> Start in Lab mode (text)
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="mt-2 w-full justify-center"
                disabled={!selected || !pinReady}
                title={
                  pinReady
                    ? "Run locked: Author and Analyze stay blocked until the code is entered"
                    : "Set a 4-digit code in Settings first"
                }
                onClick={() => selected && onStart(selected, { lock: true })}
              >
                <Lock size={16} /> Lock &amp; Run
              </Button>
              {!pinReady && (
                <p className="mt-2 text-center text-xs text-fg-muted">
                  Set a 4-digit unlock code in{" "}
                  <button
                    className="font-medium text-accent hover:underline"
                    onClick={() => setView("settings")}
                  >
                    Settings
                  </button>{" "}
                  to enable Lock &amp; Run.
                </p>
              )}
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
