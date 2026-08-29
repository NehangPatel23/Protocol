# Cursor Build Plan — Phased Implementation

Don't paste the Master Prompt, Design Spec, Consolidation Brief, and program-data.ts into Cursor as one giant instruction and ask for the whole app. That's the single most common way this kind of build goes shallow — the agent nails the obvious 20% and quietly skips or hallucinates the subtler logic (the 1RM cutoff, the missed-day pointer, the merge-vs-replace import choice). Feed it in phases instead, each one scoped enough to actually verify before moving on.

## What to hand over, and when

**Give Cursor all five files up front** (Master Prompt, Design Spec, Consolidation Brief v2, `program-data.ts`, `reference_screens.zip`) so it has full context available — but **prompt it phase by phase** using the breakdown below, not "build everything in the docs."

---

## Phase 0 — Project scaffold (do this first, verify before continuing)

Prompt Cursor with: Next.js (App Router) + TypeScript project, Tailwind configured with the exact color tokens from the Design Spec's Section 4 as custom theme values (not inline hex scattered through components), `recharts` and `lucide-react` installed, IndexedDB wrapper (`idb` package) set up per Master Prompt §5.1, and the five-tab shell (Home/Program/Progress/History/Settings) with routing and the bottom nav — empty screens, no features yet.

**Verify:** the app runs, navigation works, the color palette and typography match the Design Spec before writing a single feature.

## Phase 1 — Static data layer + Program/Library screens

Import `program-data.ts` as the seed data. Build the Program tab (day chips + exercise list) and Exercise Detail (muscle map, cues/mistakes/alternative cards, notes field) using `reference_screens/02_program.png` and `03_exercise_detail.png` as the visual target. No logging yet — this phase is "can I browse my real program and read real form cues."

**Verify:** every exercise from `program-data.ts` renders correctly, alternatives link to the right exercise, nothing is placeholder text.

## Phase 2 — Logging core: Active Session + History

Build the full Active Session flow (rest timer, set logging, RPE, warm-up rows, "same as last time") against `04_active_session.png`, writing to IndexedDB. Build History's calendar and session list against `06_history.png`. This phase is the actual product — get it solid before anything else.

**Verify:** log a real session end to end, close the tab, reopen, confirm the data persisted and shows correctly in History.

## Phase 3 — The scheduling logic (the part most likely to get skipped)

Implement Master Prompt §2.7 (missed-day pointer + auto-shift) and §2.8 (soreness → active recovery swap) explicitly — these are the two features most likely to get quietly simplified if bundled into a bigger prompt. Ask Cursor to implement these as isolated, testable functions first (given a cycle state and a date, what's "today's day"?) before wiring them into the Home screen UI.

**Verify:** manually simulate a missed day and a soreness-tap in test data and confirm the calendar and pointer behave exactly as spec'd — this is worth writing a couple of real unit tests for, not just eyeballing.

## Phase 4 — Progress & analytics

Build Progress against `05_progress.png` — PR Wall, period comparison, plateau detector, per-muscle volume with primary/secondary weighting (Master Prompt §6.4). Implement the PR-type branching (`weight` / `reps` / `inverse-weight`) and the 1RM-formula rep cutoff explicitly — these are documented precisely in `program-data.ts`'s comments and Master Prompt §6.4, so point Cursor at those rather than letting it invent generic PR logic.

**Verify:** log a few sets on the assisted pull-up machine and confirm a PR triggers on *less* assist weight, not more.

## Phase 5 — Settings, edge-case hardening, PWA

Build Settings against `07_settings.png`. Then work through Master Prompt Section 6 (all 14 subsections) as a literal checklist — assign it to Cursor as "implement these resilience rules" rather than hoping they got absorbed earlier. Finish with the PWA setup (manifest, service worker, wake lock) from §1.1 and §5.

**Verify:** this is where you deliberately try to break it — edit the program mid-session, import a backup while local data exists, go 6 days without logging anything, and confirm each edge case behaves as documented rather than crashing or silently doing the wrong thing.

---

## The one rule across all phases
When Cursor's output disagrees with a doc, the doc wins — these decisions (the Settings-tab call, the 1RM cutoff, the inverse-weight PR logic) were made deliberately across a long conversation, not arbitrarily, and a coding agent filling a gap on the fly won't have that context. If something in the docs turns out to be wrong once you're actually building against real code, that's a normal, expected revision — just make it a deliberate edit to the doc, not a silent drift.
