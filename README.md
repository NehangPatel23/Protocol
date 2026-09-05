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
  <img src="https://img.shields.io/badge/roadmap-Stage_2_of_5-14b8a6?style=flat-square" alt="Roadmap: Stage 2 of 5" />
  <img src="https://img.shields.io/badge/tests-106_passing-8b5cf6?style=flat-square" alt="106 tests passing" />
  <img src="https://img.shields.io/badge/stack-Next.js_15_·_IndexedDB-0ea5e9?style=flat-square" alt="Next.js 15 and IndexedDB" />
  <img src="https://img.shields.io/badge/status-personal_project_·_pre--alpha-6b7280?style=flat-square" alt="Personal project, pre-alpha" />
</p>

---

## Overview

Protocol is a local-first gym companion for a seeded Push / Pull / Legs / Rest / Upper / Lower / Rest program. The loop is: open on today's prescribed day, log the session, finish it, and keep history on-device in IndexedDB — no account, no server.

That loop is closed for completion and visible in History: Home's **Start Session** runs today's exercises in order, Finish Workout calls `completeTrainingDay()`, and History's month heatmap and session list read the same `calendar` / `exerciseHistory` / `sessions` stores. Progress still does not.

---

## Current Status

Honest snapshot against [`docs/Revised_Roadmap.md`](./docs/Revised_Roadmap.md). Nothing below is rounded up.

### Tier 1 — Solid, tested, trust this

- **Cycle / scheduling engine** — pointer advancement, missed-day tagging (once, not repeatedly), recovery/soreness swap with same-day undo, long-gap math (fires at 6+ days, exempts consecutive recovery), DST-safe date math. Automated tests plus several rounds of manual verification. Onboarding and Program-tab-pointer fixes are proven, not just claimed.
- **Program browsing and Exercise Detail** — seed data renders; cue / mistake / alternative cards; muscle map; notes; glossary detection; form pictograms with distinct poses per movement. Ad-hoc set logging on Exercise Detail is unchanged and still writes `exerciseHistory`.
- **Active Session → Finish Workout** — Stage 1. Home starts a real sequential session from `assignments[cycleOrder[pointerIndex]]`, reusing Exercise Detail's `SetLogger` and Program's `CardioLogger`. Finish calls the existing `completeTrainingDay()` (no parallel mark-complete path). Verified in IndexedDB after reload: `calendar[today].status === "completed"`, pointer advanced, logged set still present; Home's week strip renders the completed cell for today.
- **History calendar + session list** — Stage 2, done. Month heatmap reuses Home's week-strip statuses (completed / recovery / missed / rest / blank). Session-list membership is calendar-gated (`completed` and `recovery` only); `exerciseHistory` and `sessions` fill sets and duration on those dates, they do not invent a row if the calendar entry is gone. Tapping a day shows that day's log, or **Missed: [Day]** / a genuine empty for blank/rest. This is the first stage verified across **multiple interacting stores** (`calendar`, `exerciseHistory`, `sessions`) staying consistent through **live navigation** (change IndexedDB, leave History, come back without a full reload) — not only a single write-then-reload check. Search / filter by exercise, date range, or PRs is still unbuilt.

### Tier 2 — Real logic, not wired to UI

Tested functions Home never calls:

- `mobilityForMuscles` (rest-day suggestions) — Home shows static placeholder text instead.
- `chooseDifferentDay` / `logChosenDay` — no UI trigger.
- `shouldPromptLongGap` / `jumpToDay` / `weekdaySuggestedDay` — no dialog.

The hard part (correct logic) is done. What's missing is wiring.

### Tier 3 — Progress still does not display completed work

Finish Workout and History now share real `completed` days. Progress still does not read them:

- **Progress is an empty-shell placeholder** that doesn't read any store. Stage 4.
- Rest-day Home still shows placeholder mobility copy (`mobilityForMuscles` unused). Stage 3.

---

## What's next

Five stages in [`docs/Revised_Roadmap.md`](./docs/Revised_Roadmap.md). **Stages 1 and 2 are done.** Next is wiring Home's orphaned Tier 2 features, then Progress.

| Stage | Focus |
| --- | --- |
| **1** | ~~Real Active Session → Finish Workout → `completeTrainingDay()`~~ **Done** (verified in IndexedDB after reload) |
| **2** | ~~History calendar / heatmap / session list against real `completed` days~~ **Done** (verified across `calendar` / `exerciseHistory` / `sessions` through live navigation, not only write-then-reload) |
| **3** | Wire the orphaned Tier 2 features into Home |
| **4** | Progress: PR Wall, volume charts, period comparison, plateau detection |
| **5** | Deferred polish (equipment display, Add Exercise, PWA installability, etc.) |

Natural next increment on History (not built): search / filter by exercise, date range, or "PRs only".

---

## Tech Stack

| Layer | What we actually use |
| --- | --- |
| App | Next.js 15.5.24 (App Router), React 19.1.0, TypeScript |
| UI | Tailwind CSS 4, lucide-react, recharts |
| Persistence | IndexedDB via `idb` 8 (database name `protocol`, schema v2) |
| Tests | Vitest 4 — **106 passing** across 20 files (`npm test`, 2026-09-05) |

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

- **Progress still ignores IndexedDB.** It always renders the empty state even though Finish Workout writes `completed` days and History displays them.
- **History search / filter** (exercise, date range, PRs only) is not built — calendar + list + detail only.
- **Rest-day mobility is placeholder copy.** `mobilityForMuscles` is tested and unused.
- **Choose-a-different-day and the long-gap dialog** are tested and unused (Stage 3).
- **Add Exercise / Add workout day** are disabled "Coming soon" buttons.
- **Settings** currently exposes only the weight-unit toggle (lb / kg). Theme, rest-timer defaults, voice mode, and data export/import are not built. Session rest uses the stored defaults (180s compound / 90s isolation).
- **Active Session is the Stage 1 loop, not the full §2.3 spec.** No session summary / overload suggestion, no RPE / warm-up ramp / plate math / form-refresher, no mid-session reorder or equipment-busy swap, no wake lock.
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
