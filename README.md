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
  <img src="https://img.shields.io/badge/roadmap-Stage_4_in_progress-14b8a6?style=flat-square" alt="Roadmap: Stage 4 in progress" />
  <img src="https://img.shields.io/badge/tests-239_passing-8b5cf6?style=flat-square" alt="239 tests passing" />
  <img src="https://img.shields.io/badge/stack-Next.js_15_·_IndexedDB-0ea5e9?style=flat-square" alt="Next.js 15 and IndexedDB" />
  <img src="https://img.shields.io/badge/status-personal_project_·_pre--alpha-6b7280?style=flat-square" alt="Personal project, pre-alpha" />
</p>

---

## Overview

Protocol is a local-first gym companion for a seeded Push / Pull / Legs / Rest / Upper / Lower / Rest program. The loop is: open on today's prescribed day, log the session, finish it, and keep history on-device in IndexedDB — no account, no server.

That loop is closed for completion and visible in History: Home's **Start Session** runs today's exercises in order and stamps `startedAt` on the `sessions` store; Finish Workout calls `completeTrainingDay()` and stamps `finishedAt`. History's month heatmap, session list, and expanded session stats read the same `calendar` / `exerciseHistory` / `sessions` stores. Home also wires rest-day mobility, choose-a-different-day, and the long-gap prompt to the already-tested cycle functions. Progress reads the same `exerciseHistory` (and `calendar` for badges) for a PR Wall, trailing-7-day volume, period-over-period comparison, RPE trend, plateau callouts, and retroactive achievement badges. Logging a set writes `prs` and, when chosen, optional per-set RPE.

---

## Current Status

Honest snapshot against [`docs/Revised_Roadmap.md`](./docs/Revised_Roadmap.md). Nothing below is rounded up.

### Tier 1 — Solid, tested, trust this

- **Cycle / scheduling engine** — pointer advancement, missed-day tagging (once, not repeatedly), recovery/soreness swap with same-day undo, long-gap math (fires at 6+ days, exempts consecutive recovery), DST-safe date math. Automated tests plus several rounds of manual verification. Onboarding and Program-tab-pointer fixes are proven, not just claimed.
- **Program browsing and Exercise Detail** — seed data renders; cue / mistake / alternative cards; muscle map; notes; glossary detection; form pictograms with distinct poses per movement. Ad-hoc set logging on Exercise Detail writes `exerciseHistory`, including optional RPE when you tap 1–10.
- **Active Session → Finish Workout** — Stage 1. Home starts a real sequential session from `assignments[cycleOrder[pointerIndex]]`, reusing Exercise Detail's `SetLogger` and Program's `CardioLogger`. Start writes `startedAt` onto the `sessions` store; Finish writes `finishedAt` and calls the existing `completeTrainingDay()` (no parallel mark-complete path). Verified in IndexedDB after reload: `calendar[today].status === "completed"`, pointer advanced, logged set still present; Home's week strip renders the completed cell for today.
- **History calendar + session list** — Stage 2, done. Month heatmap reuses Home's week-strip statuses (completed / recovery / missed / rest / blank). Session-list membership is calendar-gated (`completed` and `recovery` only); `exerciseHistory` and `sessions` fill sets and duration on those dates, they do not invent a row if the calendar entry is gone. Tapping a session card expands its detail inline (independent accordion — other open cards stay open). Expanded detail shows workout duration (Start/Finish timestamps on the `sessions` store — not cardio `durationMin`; omitted when a session was finished before timestamps were stored), working-set volume, average RPE when any set stored one, and a historical PR-hit count (a set that was the all-time best *when it was logged*, via the same `setEstablishesPR` comparator as live detection — not "does this match today's PR Wall"). Calendar cells still open that day's log, or **Missed: [Day]** / a genuine empty for blank/rest. This is the first stage verified across **multiple interacting stores** (`calendar` / `exerciseHistory` / `sessions`) staying consistent through **live navigation** (change IndexedDB, leave History, come back without a full reload) — not only a single write-then-reload check. Search / filter by exercise, date range, or PRs is still unbuilt.
- **Home rest-day mobility, choose-a-different-day, long-gap prompt** — Stage 3. Home calls the existing tested functions, not lookalikes: Rest Day renders `mobilityForMuscles(...)` (recent `exerciseHistory` muscles, or the built-in back/chest/quads fallback); **Choose a different day** persists via `chooseDifferentDay` and Finish then calls `logChosenDay` (original pending date stays blank, History banner comes from that return value); the long-gap dialog renders only when `shouldPromptLongGap` is true, pick up is `dismissLongGap`, jump is `jumpToDay(..., weekdaySuggestedDay(...))`. Consecutive recovery days still do not prompt.
- **PR detection, PR Wall, weekly volume per muscle** — Stage 4 first increment. The `prs` store is written on the existing `logSet` / `deleteSet` path (no parallel logger). Detection branches on `prType`: `weight` (higher load or higher Epley 1RM at ≤12 reps), `reps` (most reps, bodyweight), `inverse-weight` (less assist at the same or more reps — assisted pull-up machine). Warm-ups (`isWarmup` or the deadlift 3×10 @ 20 kg pattern) are excluded from PRs and volume. Sets above 12 reps compare by top-set volume, not a fabricated 1RM. Weekly volume is a rolling trailing-7-calendar-day window; primary muscles get full set credit, secondary 0.5. Progress shows an explicit empty state when there is nothing to project, and a sparse caption when only one PR exists — not a blank wall.
- **Period comparison, RPE trend, plateau detector, badges** — Stage 4 remainder, done. Last-28-days vs previous-28 per muscle (same primary/secondary weighting) and per lift; the comparison is hidden behind an explicit empty state unless **both** windows contain a working set — it will not compare real weeks to empty ones. RPE is an optional 1–10 on the set logger, stored on the set in `exerciseHistory`; the trend is session-average RPE over time, a separate chart from the PR wall. Plateau flags a lift with no weight/rep progress across the last 4 working sessions, and is suppressed when `prefs.pauseMode` is in an active window. It reads `exerciseHistory` only (not the calendar) and skips ids that are not in the seed library (`program.exercises[id]`); PR Wall still shows unknown keys via `lib?.name ?? exerciseId`. Badges (`first-pr`, `ten-sessions`, `four-week-streak`) are computed from full `exerciseHistory` / `calendar` on Progress visit and written into the previously unused `badges` store, so qualifying history already in IndexedDB earns them without starting over.

### Tier 2 — closed

The three orphaned Home features above are wired. Nothing else in this tier.

### Tier 3 — remaining Stage 4 analytics

Period comparison, RPE trend, plateau detector, and badges now read real stores. Still unbuilt in §2.4:

- Strength-standard benchmarking
- Body-weight / measurement log

---

## What's next

Five stages in [`docs/Revised_Roadmap.md`](./docs/Revised_Roadmap.md). **Stages 1–3 are done.** Stage 4’s Progress analytics (PR Wall, weekly volume, period comparison, RPE trend, plateau, badges) are done; strength-standard benchmarking and the body-weight log are still unbuilt. History’s expanded session stats (duration, volume, avg RPE, historical PR hits) are wired.

| Stage | Focus |
| --- | --- |
| **1** | ~~Real Active Session → Finish Workout → `completeTrainingDay()`~~ **Done** (verified in IndexedDB after reload) |
| **2** | ~~History calendar / heatmap / session list against real `completed` days~~ **Done** (verified across `calendar` / `exerciseHistory` / `sessions` through live navigation, not only write-then-reload) |
| **3** | ~~Wire the orphaned Tier 2 features into Home~~ **Done** (`mobilityForMuscles` / `chooseDifferentDay` / `logChosenDay` / `shouldPromptLongGap` / `jumpToDay` / `weekdaySuggestedDay` on the real Home / Finish path) |
| **4** | Progress: ~~PR Wall, weekly volume, period comparison, RPE/fatigue trend, plateau detector, badges~~ **Done**. Still unbuilt: strength-standard benchmarking, body-weight log |
| **5** | Deferred polish (equipment display, Add Exercise, PWA installability, etc.) |

Natural next increment on History (not built): search / filter by exercise, date range, or "PRs only".

---

## Tech Stack

| Layer | What we actually use |
| --- | --- |
| App | Next.js 15.5.24 (App Router), React 19.1.0, TypeScript |
| UI | Tailwind CSS 4, lucide-react, recharts |
| Persistence | IndexedDB via `idb` 8 (database name `protocol`, schema v2) |
| Tests | Vitest 4 — **239 passing** across 37 files (`npm test`, 2026-09-23) |

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

- **Stage 4 Progress still does not include** strength-standard benchmarking or the body-weight/measurement log.
- **RPE capture did not exist before Stage 4.** `HistorySet.rpe` was on the type, but SetLogger and `logSet` never wrote it. Optional 1–10 is now on the logger and stored per set. Existing history from earlier testing has no RPE, so the trend chart (and History avg RPE) stay empty until new sets are logged with it — do not read a blank trend as a bug.
- **Workout duration needs Start/Finish timestamps.** Those are written on the real session path now. Sessions finished before that change have no `startedAt` / `finishedAt`, so History omits the duration line rather than inventing one. Cardio `durationMin` is still only the finisher length.
- **Plateau (and weekly muscle volume) skip unknown exercise ids.** `detectPlateaus` continues past any `exerciseHistory` key that is not in `program.exercises`. PR Wall still renders those keys using the raw id as the name. Injecting `"overhead-press"` will show a wall card and never a plateau callout; the seed OHP id is `overhead-db-press`. Calendar `completed` entries are not required for plateau.
- **Pause/deload does not fully exist as a user feature.** `prefs.pauseMode` is in the schema and the plateau detector honors an active window (`active` and `until` on or after today). Settings cannot turn pause on, and there is no per-session deload flag on stored history. Inject `prefs` → `user` → `pauseMode: { active: true, until: "YYYY-MM-DD" }` in IndexedDB to verify suppression.
- **History search / filter** (exercise, date range, PRs only) is not built — calendar + list + detail only.
- **Add Exercise / Add workout day** are disabled "Coming soon" buttons.
- **Settings** currently exposes only the weight-unit toggle (lb / kg). Theme, rest-timer defaults, voice mode, and data export/import are not built. Session rest uses the stored defaults (180s compound / 90s isolation).
- **Active Session is the Stage 1 loop, not the full §2.3 spec.** No session summary / overload suggestion, no warm-up ramp / plate math / form-refresher, no mid-session reorder or equipment-busy swap, no wake lock. Optional RPE on the shared set logger is now captured.
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
