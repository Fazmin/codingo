import { useState } from "react";
import { Check, KeyRound, Lock, Palette, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Tabs,
  Toggle,
} from "../components/ui";
import { useAppStore } from "../state/appStore";
import { ACCENTS, type AccentName } from "../lib/settings/store";
import { testProvider } from "../lib/ai/provider";
import { cn } from "../lib/utils";

type SettingsTab = "models" | "appearance";

const OPENAI_CHAT_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o4-mini"];
const ANTHROPIC_CHAT_MODELS = [
  "claude-sonnet-4-0",
  "claude-3-7-sonnet-latest",
  "claude-3-5-haiku-latest",
];
const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>("models");

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure model providers, API keys, and the look of the workspace."
        actions={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "models", label: "Models & API Keys", icon: <KeyRound size={15} /> },
              { id: "appearance", label: "Appearance", icon: <Palette size={15} /> },
            ]}
          />
        }
      />
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <div className="mx-auto max-w-2xl">
          {tab === "models" ? <ModelsTab /> : <AppearanceTab />}
        </div>
      </div>
    </>
  );
}

function ModelsTab() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const model = settings.model;

  const [test, setTest] = useState<{
    loading: boolean;
    ok?: boolean;
    message?: string;
  }>({ loading: false });

  const setModel = (patch: Partial<typeof model>) =>
    updateSettings({ model: { ...model, ...patch } });

  const chatModels =
    model.provider === "anthropic" ? ANTHROPIC_CHAT_MODELS : OPENAI_CHAT_MODELS;

  async function runTest() {
    setTest({ loading: true });
    const res = await testProvider(model.provider, settings);
    setTest({ loading: false, ok: res.ok, message: res.message });
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-fg">Socratic tutor model</h2>
        <p className="mb-4 text-xs text-fg-muted">
          Drives the voice tutor and the post-hoc session analysis.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Provider">
            <Select
              value={model.provider}
              onChange={(e) =>
                setModel({
                  provider: e.target.value as "openai" | "anthropic",
                  chatModel:
                    e.target.value === "anthropic"
                      ? ANTHROPIC_CHAT_MODELS[0]
                      : OPENAI_CHAT_MODELS[0],
                })
              }
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </Select>
          </Field>
          <Field label="Chat model">
            <Select
              value={model.chatModel}
              onChange={(e) => setModel({ chatModel: e.target.value })}
            >
              {chatModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-fg">API keys</h2>
        <p className="mb-4 text-xs text-fg-muted">
          Stored locally on this device only. Voice (transcription &amp; speech) always
          uses OpenAI, so an OpenAI key is needed for the Talk button even when the tutor
          runs on Anthropic.
        </p>
        <div className="flex flex-col gap-4">
          <Field label="OpenAI API key">
            <Input
              type="password"
              placeholder="sk-..."
              value={model.openaiKey}
              autoComplete="off"
              onChange={(e) => setModel({ openaiKey: e.target.value })}
            />
          </Field>
          <Field label="Anthropic API key">
            <Input
              type="password"
              placeholder="sk-ant-..."
              value={model.anthropicKey}
              autoComplete="off"
              onChange={(e) => setModel({ anthropicKey: e.target.value })}
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" onClick={runTest} disabled={test.loading}>
              {test.loading ? <Spinner /> : null}
              Test {model.provider === "anthropic" ? "Anthropic" : "OpenAI"} connection
            </Button>
            {test.message && (
              <Badge tone={test.ok ? "success" : "danger"}>
                {test.ok ? <Check size={12} /> : <X size={12} />}
                <span className="max-w-xs truncate">{test.message}</span>
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-fg">Voice (OpenAI)</h2>
        <p className="mb-4 text-xs text-fg-muted">
          Speech-to-text and text-to-speech models for the press-to-talk agent.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Transcription">
            <Select
              value={model.transcriptionModel}
              onChange={(e) => setModel({ transcriptionModel: e.target.value })}
            >
              <option value="whisper-1">whisper-1</option>
              <option value="gpt-4o-transcribe">gpt-4o-transcribe</option>
              <option value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</option>
            </Select>
          </Field>
          <Field label="Speech model">
            <Select
              value={model.speechModel}
              onChange={(e) => setModel({ speechModel: e.target.value })}
            >
              <option value="tts-1">tts-1</option>
              <option value="tts-1-hd">tts-1-hd</option>
              <option value="gpt-4o-mini-tts">gpt-4o-mini-tts</option>
            </Select>
          </Field>
          <Field label="Voice">
            <Select
              value={model.speechVoice}
              onChange={(e) => setModel({ speechVoice: e.target.value })}
            >
              {VOICES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-fg">Identity</h2>
        <p className="mb-4 text-xs text-fg-muted">
          The student id recorded on sessions you run in Learn mode.
        </p>
        <Field label="Student id">
          <Input
            value={settings.studentId}
            onChange={(e) => updateSettings({ studentId: e.target.value })}
          />
        </Field>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-fg">
          <Lock size={15} /> Session lock
        </h2>
        <p className="mb-4 text-xs text-fg-muted">
          A 4-digit code that unlocks a <strong>Lock &amp; Run</strong> session. While
          a session is locked, the student cannot reach the Author or Analyze screens
          until this code is entered.
        </p>
        <div className="flex items-end gap-3">
          <Field label="Unlock code (4 digits)">
            <Input
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              placeholder="••••"
              value={settings.lockPin}
              autoComplete="off"
              onChange={(e) =>
                updateSettings({
                  lockPin: e.target.value.replace(/\D/g, "").slice(0, 4),
                })
              }
              className="w-32 text-center tracking-[0.4em]"
            />
          </Field>
          {settings.lockPin.length === 4 ? (
            <Badge tone="success">
              <Check size={12} /> Code set
            </Badge>
          ) : (
            <Badge tone="warning">Enter 4 digits to enable</Badge>
          )}
        </div>
      </Card>
    </div>
  );
}

function AppearanceTab() {
  const appearance = useAppStore((s) => s.settings.appearance);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setApp = (patch: Partial<typeof appearance>) =>
    updateSettings({ appearance: { ...appearance, ...patch } });

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-fg">Theme</h2>
        <p className="mb-4 text-xs text-fg-muted">
          Choose light, dark, or follow the operating system.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(["light", "dark", "system"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setApp({ theme: mode })}
              className={cn(
                "rounded-lg border p-3 text-left text-sm capitalize transition-colors",
                appearance.theme === mode
                  ? "border-accent bg-accent/5 text-fg"
                  : "border-border text-fg-muted hover:border-fg-muted/40",
              )}
            >
              <div
                className={cn(
                  "mb-2 h-10 w-full rounded-md border",
                  mode === "light" && "bg-white",
                  mode === "dark" && "bg-slate-900",
                  mode === "system" &&
                    "bg-gradient-to-r from-white to-slate-900",
                )}
              />
              {mode}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-fg">Accent color</h2>
        <p className="mb-4 text-xs text-fg-muted">Used across buttons, highlights, and focus.</p>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(ACCENTS) as AccentName[]).map((name) => (
            <button
              key={name}
              onClick={() => setApp({ accent: name })}
              title={ACCENTS[name].label}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition-all",
                appearance.accent === name ? "ring-fg/60" : "ring-transparent",
              )}
              style={{ backgroundColor: `hsl(${ACCENTS[name].light})` }}
            >
              {appearance.accent === name && <Check size={16} className="text-white" />}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-fg">Display</h2>
        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-fg">Interface scale</span>
              <Badge>{Math.round(appearance.fontScale * 100)}%</Badge>
            </div>
            <input
              type="range"
              min={0.85}
              max={1.25}
              step={0.05}
              value={appearance.fontScale}
              onChange={(e) => setApp({ fontScale: Number(e.target.value) })}
              className="w-full accent-[hsl(var(--accent))]"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-fg">Sync editor theme</div>
              <div className="text-xs text-fg-muted">
                Match the Monaco code editor to light/dark.
              </div>
            </div>
            <Toggle
              checked={appearance.syncEditorTheme}
              onChange={(v) => setApp({ syncEditorTheme: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-fg">Reduce motion</div>
              <div className="text-xs text-fg-muted">
                Minimize animations and transitions.
              </div>
            </div>
            <Toggle
              checked={appearance.reduceMotion}
              onChange={(v) => setApp({ reduceMotion: v })}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
