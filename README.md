<p align="center">
  <img src="public/icons/icon-p-512.png" alt="Protocol" width="96" height="96" />
</p>

<h1 align="center">Protocol</h1>

<p align="center">
  <strong>Strength training, planned and logged with precision.</strong>
</p>

<p align="center">
  <a href="./docs/Fitness_Tracker_Master_Prompt.md">Docs</a> ·
  <a href="./docs/Revised_Roadmap.md">Roadmap</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/roadmap-Stage_0_of_5-64748b?style=flat-square" alt="Roadmap: Stage 0 of 5" />
  <img src="https://img.shields.io/badge/tests-53_passing-8b5cf6?style=flat-square" alt="53 tests passing" />
  <img src="https://img.shields.io/badge/stack-Next.js_15_·_IndexedDB-0ea5e9?style=flat-square" alt="Next.js 15 and IndexedDB" />
  <img src="https://img.shields.io/badge/status-personal_project_·_pre--alpha-6b7280?style=flat-square" alt="Personal project, pre-alpha" />
</p>

---

## Overview

Protocol is a local-first gym companion for a seeded Push / Pull / Legs / Rest / Upper / Lower / Rest program. The intended loop is: open on today's prescribed day, log the session, finish it, and keep history on-device in IndexedDB — no account, no server.

That loop is not closed yet. You can browse the program, read form cues, and start the cycle pointer; you cannot yet complete a workout in a way that marks the day done.

---

## Current Status

Honest snapshot against [`docs/Revised_Roadmap.md`](./docs/Revised_Roadmap.md). Nothing below is rounded up.

### Tier 1 — Solid, tested, trust this

- **Cycle / scheduling engine** — pointer advancement, missed-day tagging (once, not repeatedly), recovery/soreness swap with same-day undo, long-gap math (fires at 6+ days, exempts consecutive recovery), DST-safe date math. Automated tests plus several rounds of manual verification. Onboarding and Program-tab-pointer fixes are proven, not just claimed.
- **Program browsing and Exercise Detail** — seed data renders; cue / mistake / alternative cards; muscle map; notes; glossary detection; form pictograms with distinct poses per movement. Mostly reasoning-only (no dedicated tests, not fully click-through verified), but no red flags have turned up in this area specifically.

### Tier 2 — Real logic, not wired to UI

Tested functions Home never calls:

- `mobilityForMuscles` (rest-day suggestions) — Home shows static placeholder text instead.
- `chooseDifferentDay` / `logChosenDay` — no UI trigger.
- `shouldPromptLongGap` / `jumpToDay` / `weekdaySuggestedDay` — no dialog.

The hard part (correct logic) is done. What's missing is wiring.

### Tier 3 — The gap that blocks almost everything else

Nothing connects "I worked out" to "this day is done":

- `completeTrainingDay()` exists, is tested in isolation, and is **never called from anywhere in the app**.
- **Start Session** on Home is a link to Program browsing, not a real session.
- Exercise Detail's set logger writes to `exerciseHistory` per exercise; nothing aggregates that into a finished session or advances the cycle pointer.
- The `completed` calendar status **cannot currently be produced by any real user action** — only `missed` and `recovery` can happen from actual use.
- **History and Progress are empty-shell placeholders** that don't read any store.

---

## What's next

Five stages in [`docs/Revised_Roadmap.md`](./docs/Revised_Roadmap.md). **None have started.** Stage 1 is the keystone; everything downstream depends on it.

| Stage | Focus |
| --- | --- |
| **1** | Real Active Session → Finish Workout → `completeTrainingDay()` (verified in IndexedDB after reload) |
| **2** | History calendar / heatmap / session list against real `completed` days |
| **3** | Wire the orphaned Tier 2 features into Home |
| **4** | Progress: PR Wall, volume charts, period comparison, plateau detection |
| **5** | Deferred polish (equipment display, Add Exercise, PWA installability, etc.) |

---

## Tech Stack

| Layer | What we actually use |
| --- | --- |
| App | Next.js 15.5.24 (App Router), React 19.1.0, TypeScript |
| UI | Tailwind CSS 4, lucide-react, recharts |
| Persistence | IndexedDB via `idb` 8 (database name `protocol`, schema v2) |
| Tests | Vitest 4 — **53 passing** across 9 files (`npm test`, 2026-09-01) |

No backend. No auth. Data lives in the browser that logged it.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test      # vitest run
npm run lint
```

There is no production deploy. Run it locally.

---

## Known Limitations

Specific, current, not generic:

- **No Active Session.** Home's "Start Session" opens Program with today's day selected. There is no rest timer flow, no Finish Workout, and no call to `completeTrainingDay()`.
- **No completed days from use.** Calendar `completed` cannot be produced by tapping through the app.
- **History and Progress ignore IndexedDB.** They always render the empty state.
- **Rest-day mobility is placeholder copy.** `mobilityForMuscles` is tested and unused.
- **Add Exercise / Add workout day** are disabled "Coming soon" buttons.
- **Settings** currently exposes only the weight-unit toggle (lb / kg). Theme, rest-timer defaults, voice mode, and data export/import are not built.
- **Not a full PWA yet.** Apple touch icons and `apple-web-app` metadata exist; there is no web app manifest and no service worker. Offline shell / installability polish is Stage 5.
- **Not deployed.** No live URL.
- **One browser, one device.** No accounts, no sync. Private browsing can drop IndexedDB (the shell warns when persistence looks unavailable).

---

## Documentation

| Doc | Role |
| --- | --- |
| [`docs/Fitness_Tracker_Master_Prompt.md`](./docs/Fitness_Tracker_Master_Prompt.md) | Product spec: features, data model, edge cases |
| [`docs/Fitness_Tracker_UIUX_Design_Spec.md`](./docs/Fitness_Tracker_UIUX_Design_Spec.md) | Tokens, IA, visual rules |
| [`docs/UI_Consolidation_Brief_v2.md`](./docs/UI_Consolidation_Brief_v2.md) | UI consolidation decisions |
| [`docs/Revised_Roadmap.md`](./docs/Revised_Roadmap.md) | Current state and what to build next (supersedes the original build plan) |
| [`docs/archive/Cursor_Build_Plan_ORIGINAL.md`](./docs/archive/Cursor_Build_Plan_ORIGINAL.md) | Archived phase plan — history only, not sequencing |
