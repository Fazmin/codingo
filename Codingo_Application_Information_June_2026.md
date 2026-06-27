# Codingo — Application Information

*A briefing for Computer Science faculty and academic leadership*
*June 2026*

> **A note on naming.** Inside the codebase this application carries the working
> title **"Socratic Learning Workspace."** "Codingo" is the project name used in this
> document. The two refer to the same application.

---

## 1. Executive summary

Codingo is a cross-platform **desktop application for capturing and assessing the
*process* of student problem-solving in programming — not only the final code that is
submitted.** It is built on a simple but consequential premise: in the age of generative
AI, the artifact a student hands in (a working function, a passing test) tells you less
and less about what the student actually understands. Codingo shifts the unit of
assessment from the *product* to the *process* — the questions a student asks, the
hypotheses they form, the errors they hit, the pauses they take, and how much help they
needed to get unstuck.

The application is organised around **one app with three modes**:

- **Author** — educators design reusable "learning campaigns" (a task, starter files,
  named learning objectives, and a policy for how much help the AI tutor may give).
- **Learn** — students work in a focused coding workspace and can reach an AI tutor
  **only by voice**. Every meaningful action is timestamped to a local, append-only log.
- **Analyze** — educators read an AI-generated, **evidence-linked** report on each
  session, with every claim tied to an exact moment in a **replay** so it can be verified.

The AI tutor is **Socratic by design**: it never hands over the answer. It climbs a
graduated "hint ladder," giving the smallest nudge that could unblock the student, and
only escalates after the student has genuinely tried something — and never beyond a cap
the instructor sets per campaign.

Everything runs **locally**. Student data, the event log, settings, and API keys stay on
the device; nothing is uploaded to a Codingo server (there is none). The only outbound
network calls are to the language-model provider the instructor configures.

---

## 2. The pedagogical thesis

Codingo is opinionated software. Its design choices flow from a small set of
well-established ideas in computing education and the learning sciences. This section
states the "why" before the "what."

### 2.1 Assess the process, not just the product

A correct program is increasingly cheap to obtain and increasingly uninformative as
evidence of learning. Codingo treats the **trajectory** — attempts, errors, recoveries,
questions, and the amount of scaffolding required — as the primary evidence of learning.
This reflects a long tradition in education of valuing **formative** insight (how is this
student thinking?) alongside **summative** judgement (did they get it right?).

### 2.2 The Socratic method and productive struggle

The tutor is built to *withhold* answers and instead ask questions, because struggle that
remains productive is where durable learning happens. A tutor that immediately supplies
the solution removes the very cognitive work that creates understanding. Codingo's tutor
is therefore engineered to do the opposite of a typical code assistant: its default move
is to ask the student for their own hypothesis before offering any hint.

### 2.3 Scaffolding and graduated hinting

Help should be **contingent** — just enough, just in time, and faded as competence grows.
Codingo operationalises this with an explicit five-rung **hint ladder** (Section 4). The
tutor always tries the lowest rung that could unblock the student, escalating only when
the student has made a genuine new attempt. This mirrors the idea of scaffolding that is
deliberately withdrawn as the learner takes over more of the task.

### 2.4 Transfer as the real goal

It is not enough for a student to be carried through one problem. Codingo's analysis
explicitly asks whether the student later showed **independence on a similar step** —
i.e., whether learning *transferred*. A student who needed a strong hint early but then
handled an analogous situation alone is demonstrating exactly the kind of growth a course
is trying to produce.

### 2.5 Evidence over impression

AI-generated narratives can be persuasive and wrong. Codingo is built so that the
educator never has to take the AI's word for it: **every notable claim in a report is
linked to a precise timestamp** in a replay of the session, and the instructor can scrub
straight to that moment to confirm or reject it. The AI is instructed to report
observations, *not* to accuse students of cheating, and to "reward evidence of genuine
reasoning and transfer, not performance of good-sounding questions."

---

## 3. The three modes in depth

### 3.1 Author — designing a learning campaign

**What it is.** Author mode is where an instructor builds a *campaign*: a reusable
assessment/practice activity that students will run in Learn mode and that the instructor
will later review in Analyze mode.

**What's in a campaign.**

- **Title & description** — short framing shown to the student.
- **Task prompt** — the problem statement the student is asked to solve.
- **Starter files** — one or more editable code files (Python or JavaScript) that
  pre-populate the student's workspace.
- **Learning objectives** — *named* concepts (e.g. `loop-termination`, `off-by-one`,
  `operator-precedence`). These are not decorative: they become the rows of the analysis
  heat-map and the categories the tutor and the analysis reason about.
- **Disclosure policy** — a campaign-wide default plus optional **per-objective
  overrides** that cap how much the tutor may reveal (see Section 4).
- **Allowed resources** — declarative flags for "language docs" and "open web."
- **Time budget** — an optional, **soft** time target in minutes.

**Why it's built this way.** Naming objectives forces the instructor to articulate, up
front, *what this task is actually meant to teach*. That single act of design does two
things: it makes the later analysis legible (the heat-map is organised by those exact
objectives), and it lets the instructor tune help **per concept**. A common and powerful
pattern, visible in the sample campaigns, is to set a permissive default for incidental
syntax but mark the *core* concept of the exercise as `strict` — so the tutor will help a
student past a forgotten method name, but will refuse to give away the idea the exercise
is really testing.

### 3.2 Learn — the student's focused, recorded workspace

**What it is.** A distraction-light coding environment with four parts: a **task pane**
(prompt, objectives, and the active disclosure level), a **Monaco code editor**
(the same editor engine as VS Code, self-hosted for offline use), a **run/console** pane,
and a **Socratic tutor** panel that is **voice-only** by default.

**What happens during a session.**

- The student writes and runs code locally. Output, errors (with a best-effort line
  number), and exit codes appear in the console.
- To get help, the student **holds a Talk button and speaks**. Their speech is
  transcribed, sent to the Socratic tutor, and the tutor's reply is **spoken back**.
- Behind the scenes, an **append-only event log** timestamps everything meaningful
  (Section 5).

**Why voice-only?** This is a deliberate pedagogical and integrity choice, not a
gimmick:

1. **It makes thinking audible.** Asking a question out loud forces the student to put
   their confusion into words — a productive act in itself — and gives the instructor a
   genuine record of how the student reasons.
2. **It raises the friction on "just give me the code."** You cannot silently paste a
   problem into a chat box and copy a solution back out. The natural channel is a spoken
   question, and the tutor answers in spoken hints, not pasteable code.
3. **It produces richer evidence.** Spoken questions, captured verbatim, are some of the
   most revealing data in the later report ("notable questions").

**Accessibility is first-class, not an afterthought.** A student can switch to a
**typed-input ("accommodated") mode** at any time. Doing so flags the session as
accommodated so the instructor reviews it in the right context, and it never disadvantages
the student. The tutor also falls back to the browser's built-in speech synthesis if the
hosted voice is unavailable, so it is never silently mute.

**Lock & Run (optional, for higher-stakes use).** If the instructor sets a 4-digit code,
a session can be started **locked**: the student is held in the Learn workspace and cannot
navigate to Author or Analyze until the code is entered. This is a lightweight classroom
control for invigilated settings; it is intentionally a *soft* guardrail (see
Section 8), not a hardened lockdown browser.

### 3.3 Analyze — reviewing the process, with evidence

**What it is.** Analyze mode lets the instructor pick a campaign, see its sessions, and
generate (or re-generate) an AI report for any one of them. Reports are cached locally so
they don't need to be regenerated each time.

**What a report contains.**

- **One-line summary** — used in the session list for quick scanning.
- **Narrative** — a 3–5 sentence account of how the student approached the task.
- **Objective scaffolding heat-map** — one row per learning objective, showing the
  **highest hint rung** the student needed and a **transfer** verdict
  (`demonstrated` / `partial` / `not-observed`).
- **Notable questions** — the most revealing questions the student asked.
- **Moments worth attention** — specific events the instructor should look at, **each
  linked to a timestamp**.

**The replay scrubber.** Below the report is a timeline of the whole session.
Coloured markers show every event by type (runs, errors, hints, hypotheses, pastes, idle
gaps, etc.). The code editor above the timeline **reconstructs the student's code at any
point in time** from the recorded edit snapshots. Clicking any "moment worth attention"
jumps the replay straight to that instant.

**Why it's built this way.** The heat-map answers the question instructors most want
answered at a glance — *for each thing this task was meant to teach, how much help did
this student need, and did it stick?* The mandatory timestamp links are the integrity
backbone of the whole tool: the AI is positioned as a fast first-pass reader of the
evidence, and the educator remains the judge, able to verify any claim in one click. The
analysis prompt explicitly forbids the model from inferring cheating and requires every
cited timestamp to be a real event from the log.

---

## 4. The hint ladder and disclosure caps (the heart of the tutor)

This is the most important mechanism in Codingo and the one faculty will most want to
understand.

### 4.1 The five rungs

Every tutor reply is tagged with the **rung** of help it represents:

| Rung | Name | What the tutor does |
|------|------|---------------------|
| 0 | **Reflect** | Mirrors the student back to their own thinking; asks for a hypothesis. |
| 1 | **Orient** | Directs attention to the right place ("look at what happens on the last loop"). |
| 2 | **Category** | Names the *kind* of issue ("this is an edge-case problem"). |
| 3 | **Concept** | Names the concept involved — but **not** the implementation. |
| 4 | **Worked example / partial structure** | Offers partial structure or a syntax-level nudge. |

The guiding rule given to the tutor is to choose the **lowest rung that could plausibly
unblock the student**, and to keep replies short, spoken-friendly, and usually ending in
a question.

### 4.2 Two gates before any escalation

The tutor will not simply climb the ladder on demand. Two conditions, enforced by the
application's session logic, govern escalation:

1. **Hypothesis first.** If the tutor has not yet heard the student's *own* guess, it is
   instructed to ask for one before hinting. When the student answers, that utterance is
   recorded as a **hypothesis** event.
2. **Effort earns escalation.** The tutor only moves to a higher rung than last time if
   the student has **actually attempted something** (edited or ran code) since the last
   hint. Repeatedly asking without trying does *not* unlock more help — the tutor gently
   redirects the student back to the work.

### 4.3 The disclosure cap — instructor control, deterministically enforced

Each campaign sets a **disclosure level** that caps how high the tutor may climb:

| Level | Cap | Intended use |
|-------|-----|--------------|
| **strict** | Rung 2 | Core concepts you want the student to reach themselves. |
| **balanced** | Rung 3 | The default for most work. |
| **permissive** | Rung 4 | Incidental syntax; low-stakes practice. |

Two design details matter for faculty confidence:

- **Per-objective overrides.** The cap can differ by objective within a single task. This
  is what lets an instructor be generous about syntax while protecting the central idea
  of the exercise.
- **It is enforced in code, not merely requested in the prompt.** The model is *told* the
  cap, but the application *also* clamps the final rung deterministically to the cap for
  the relevant objective before anything is shown or logged. In other words, even if the
  model tried to over-help, **the logged and delivered hint can never exceed the
  pedagogical cap the instructor set.** This separation of "ask the model nicely" from
  "guarantee the bound in code" is a deliberate trust feature.

---

## 5. What is captured, and why

Learn mode writes to a local, **append-only** event log. Append-only matters: events are
never edited or deleted, so the record the instructor reviews is the record as it
happened, in order.

**Event types captured:**

- **edit** — code changes (debounced), including a **full snapshot** of the file. The
  snapshots are what make code reconstruction in the replay possible.
- **run** — a code execution, with language, exit code, and duration.
- **output** — captured stdout/stderr (truncated to a reasonable size).
- **error** — a parsed error message and best-effort line number.
- **paste** — the size of a paste, flagged as **large** above ~200 characters. (Notably,
  Codingo records pastes as a *signal for the educator to consider in context* — not as an
  automatic accusation.)
- **agent_request** — what the student asked the tutor (the transcribed utterance).
- **agent_reply** — the tutor's reply, with its rung and the objective it addressed.
- **hypothesis** — the student's own guess, when the tutor solicited one.
- **idle** — a gap in activity longer than ~20 seconds, with its duration.
- **task_state** — lifecycle markers: started, paused/resumed (the app notes when the
  window loses or regains focus), and submitted.

**Why capture this much?** Each event type maps to something an instructor would
otherwise have to guess at. Idle gaps can indicate thinking, being stuck, or stepping
away. The sequence of error → edit → run shows whether a student is reasoning about a bug
or guessing. Hypotheses captured before hints let the analysis reward genuine reasoning.
Together they reconstruct a story the final code alone cannot tell.

---

## 6. The interaction pipeline (voice)

For faculty who want to understand how a spoken question becomes a spoken hint, the chain
is:

1. **Record** — the student holds the Talk button; audio is captured locally.
2. **Transcribe** — the audio is sent to a speech-to-text model (OpenAI Whisper family).
3. **Tutor** — the transcript, the recent conversation, the current code, and the
   campaign's policy are sent to the Socratic model, which returns a structured reply
   (text + rung + objective + whether it asked for a hypothesis).
4. **Speak** — the reply is read aloud via a text-to-speech model, with the operating
   system's built-in speech as a fallback.

In typed (accommodated) mode, steps 1–2 are simply replaced by the student typing.

---

## 7. Architecture, in plain terms

Codingo is intentionally a **local-first desktop application**. The headline implications
for faculty and IT:

- **It is one installable desktop app**, not a web service students log into. There is no
  central server collecting data.
- **All data lives on the device** in a local database file and on-disk settings:
  campaigns, sessions, the event log, and cached reports.
- **The code editor is the same engine as VS Code** (Monaco), bundled for offline use.
- **Student code runs on the local machine** through a small, explicit interpreter
  allowlist (`python3` for Python, `node` for JavaScript). The application will not run
  arbitrary programs — only those two interpreters, chosen by the file's language.
- **The only outbound network traffic** is to the language-model provider the instructor
  configures. Two providers are supported for the tutor and analysis (OpenAI or
  Anthropic); **voice always uses OpenAI**, so an OpenAI key is required for the Talk
  button even if the tutor itself runs on Anthropic.
- **API keys are stored locally** on the device and are entered by the instructor in
  Settings, where a "Test connection" button validates them.

The application is also configurable in human terms: light/dark/system themes, an accent
colour, interface scale, reduced-motion, and an editor-theme sync — useful for classroom
projectors and for accessibility.

---

## 8. Academic integrity, honestly framed

Codingo improves integrity primarily by **changing what is assessed** and by **making the
process visible**, not by surveillance theatre. Faculty should understand both its
strengths and its limits.

**What it does well:**

- The voice-only channel and answer-withholding tutor make "copy the prompt, paste the
  answer" a poor fit for the workflow.
- The append-only log, large-paste flags, idle gaps, and full replay give an instructor
  rich, time-ordered context to interpret a session.
- The analysis is built to *inform an educator's judgement*, explicitly refusing to label
  students as cheating and linking every claim to verifiable evidence.

**What it is not (by design):**

- **Lock & Run is a soft guardrail.** It blocks in-app navigation behind a 4-digit code;
  it is not a hardened, OS-level lockdown browser and does not prevent a determined
  student from using another device or application.
- **Allowed-resources flags ("language docs," "open web") are declarative.** They are
  shown to the student as part of the task's ground rules; the application does not
  technically enforce or block external browsing.
- **The local code runner has no resource or time sandbox.** It restricts *which*
  interpreters can run, but student code executes on the host machine. For lab deployment,
  treat it as you would any environment where students run their own code.

These are not hidden weaknesses to be discovered later — they are stated here so a pilot
can plan around them (e.g. pairing Lock & Run with normal invigilation).

---

## 9. Privacy and data governance

- **Local by default.** Sessions, the keystroke-level event log, and reports are stored
  on the device only. There is no Codingo cloud and no upload of student work.
- **Provider calls.** Transcripts, code context, and event logs *are* sent to the
  configured AI provider when the tutor responds or a report is generated. Institutions
  should account for this in their data-processing and vendor-review policies.
- **Sensitivity of capture.** Keystroke- and snapshot-level capture is genuinely
  sensitive personal data. For any real pilot beyond a volunteer demo, the application's
  own guidance is explicit: **plan informed consent and a data-governance review** before
  collecting student data.

---

## 10. Worked examples: the bundled sample campaigns

Three first-year-CS campaigns ship as examples and illustrate the design philosophy
concretely:

1. **"FizzBuzz: Loops & Conditionals."** Default disclosure is *balanced*, but the
   `modulo-operator` and `order-of-conditions` objectives are set to *strict* — the tutor
   helps with loop mechanics while protecting the two ideas the exercise really probes.
   Objectives: loop-termination, conditional-logic, modulo-operator, order-of-conditions.

2. **"Debug It: The Wrong Average."** A deliberately buggy function (off-by-one iteration,
   a precedence error, and an empty-list crash). Default disclosure is *strict* to push
   students to read and reason about code rather than rewrite it; only
   `operator-precedence` is relaxed to *balanced*. The prompt explicitly asks students to
   form a hypothesis about each bug before changing anything.

3. **"Reverse a String, Three Ways."** Default disclosure is *permissive* because the
   exercise is open-ended on syntax; the `function-decomposition` objective is pulled back
   to *balanced* so the genuinely conceptual part stays a thinking task.

The pattern across all three — **generous on syntax, protective on the core idea** — is
the intended way to use disclosure levels.

---

## 11. Suggested classroom uses

- **Formative lab work / "thinking out loud" practice**, where the value is the process
  and the conversation, with low integrity stakes.
- **Concept diagnostics**, using the objective heat-map across a class to see which
  concepts consistently required the most scaffolding.
- **One-on-one review and feedback**, where the replay and notable questions give an
  instructor a fast, evidence-grounded read on a student before a meeting.
- **Invigilated assessment**, paired with Lock & Run and normal proctoring, understanding
  the soft-guardrail caveats in Section 8.

---

## 12. Glossary

- **Campaign** — a reusable activity authored by an instructor (task, files, objectives,
  disclosure policy).
- **Session** — one student's recorded attempt at a campaign.
- **Event log** — the append-only, timestamped record of everything that happened in a
  session.
- **Hint ladder / rung** — the five graduated levels of help (0 Reflect → 4 Worked
  example).
- **Disclosure level / cap** — the instructor's per-campaign (and optionally
  per-objective) ceiling on how high the tutor may climb the ladder.
- **Transfer** — whether a student later showed independence on a similar step
  (`demonstrated` / `partial` / `not-observed`).
- **Accommodated session** — a session run in typed-input mode for accessibility, flagged
  as such for the reviewer.
- **Lock & Run** — a soft, PIN-gated mode that keeps a student in the workspace during a
  session.

---

*This document describes Codingo as implemented as of June 2026. Every behaviour above is
drawn from the application's actual design; where a control is a soft guardrail or a
declarative signal rather than a hard technical enforcement, that distinction is stated
explicitly so it can be relied upon in planning a pilot.*
