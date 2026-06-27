# Socratic Learning Workspace

A cross-platform desktop app (Tauri + React) for capturing and assessing the *process*
of student problem-solving, not just the final artifact. One app, three modes:

- **Author** - educators build reusable learning campaigns (task prompt, starter files,
  named objectives, and a per-objective disclosure level that caps how much the tutor reveals).
- **Learn** - students work in a focused workspace (Monaco editor + run/console + task pane)
  and can only reach the AI tutor by **voice**. Every keystroke, run, error, paste, idle gap,
  and spoken exchange is timestamped to a local append-only event log.
- **Analyze** - educators review an LLM-generated, evidence-linked report per session: a
  narrative, an objective-by-objective scaffolding heat-map, notable questions, and moments
  worth attention - each linked to an exact moment in a **replay scrubber** so claims can be verified.

The Socratic tutor never hands over answers. It climbs a graduated hint ladder
(0 Reflect -> 1 Orient -> 2 Category -> 3 Concept -> 4 Partial example), only escalating
after the student has genuinely attempted something, and never past the campaign's disclosure cap.

## Tech stack

- **Shell:** Tauri v2 (Rust core + WebView frontend), single lightweight binary.
- **Frontend:** React + TypeScript + Vite + Tailwind, Monaco editor (self-hosted, offline).
- **Storage:** SQLite via `tauri-plugin-sql` (event log + campaigns + sessions + cached reports).
- **LLM:** [Vercel AI SDK](https://ai-sdk.dev) v5 (`streamText`/`generateObject` for the tutor and
  analysis; `experimental_transcribe`/`experimental_generateSpeech` for voice). Provider calls are
  routed through `tauri-plugin-http` to bypass the WebView's CORS enforcement in production builds.
- **Voice:** `MediaRecorder` -> OpenAI Whisper transcription -> tutor -> OpenAI TTS playback,
  with a `speechSynthesis` fallback and a typed-input accessibility mode (flags the session as accommodated).

## Prerequisites

- Node.js 18+ and [pnpm](https://pnpm.io) (`corepack enable` will provide it)
- Rust toolchain (`cargo`) and the Tauri system dependencies for your OS
- For code execution in Learn mode: `python3` and/or `node` on your PATH
- API keys (added in-app under **Settings -> Models & API Keys**, stored locally only):
  - OpenAI key (required for voice transcription/speech; usable for the tutor too)
  - Anthropic key (optional, if you select Anthropic as the tutor provider)

## Run

```bash
pnpm install
pnpm tauri:dev      # launch the desktop app in dev
```

Build a distributable binary:

```bash
pnpm tauri:build
```

You can also run the UI in a plain browser (`pnpm dev`) for quick visual iteration, but the
database, code execution, and disk-backed settings require the desktop app.

## First steps

1. Open **Settings**, pick a theme, and paste an OpenAI (and/or Anthropic) API key. Use **Test connection**.
2. In **Author**, create a campaign with a task prompt, starter file, and a few objectives.
3. In **Learn**, start a session, write/run code, and hold the **Talk** button to ask the tutor.
4. Submit, then open **Analyze** to generate the report and scrub the replay.

## Privacy

All data stays local (SQLite + on-disk settings; no upload). Keystroke-level capture is sensitive -
for any real pilot, plan consent and a data-governance review.
