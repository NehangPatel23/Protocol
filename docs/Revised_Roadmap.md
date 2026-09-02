# Revised Roadmap — Based on Actual Current State

Supersedes `Cursor_Build_Plan.md`'s phase sequence. That plan assumed clean boundaries (Phase 1: browse, Phase 2: log, Phase 3: cycle, Phase 4: analytics). What actually got built is different: pieces of every phase exist, scattered and mostly disconnected from each other. This roadmap plans forward from what's real, not from what was predicted eight rounds ago.

## How we got here (context, not blame)

Every time you asked Cursor "what else is relevant" and said yes, a slice of a later phase got pulled forward — the cycle/scheduling engine, the soreness flow, the glossary system, form pictograms. Each slice was individually reasonable and mostly well-built. But they landed disconnected: the scheduling engine got built before the thing that was supposed to drive it (finishing a real workout) existed. That's not wasted work — it's real, tested, and mostly good. It's just aimed at a gap that hasn't been filled yet.

## The current state, honestly, in three tiers

### Tier 1 — Genuinely solid, well-tested, trust this
The **cycle/scheduling engine** is the best-built part of the app: pointer advancement, missed-day tagging (once, not repeatedly), the recovery/soreness swap with correct same-day undo, the long-gap prompt's math (fires at 6+ days, exempts consecutive recovery), DST-safe date math. This is the hardest, most novel part of the whole spec, and it has real automated test coverage plus several rounds of manual verification behind it. The recent onboarding and Program-tab-pointer fixes are also now proven, not just claimed.

**Program browsing and Exercise Detail** are consistent and real: seed data renders correctly, cue/mistake/alternative cards, muscle map, notes, glossary detection, form pictograms with distinct poses per movement. Mostly "reasoning only" (no dedicated tests, not fully clicked through) but no red flags have turned up in it specifically.

### Tier 2 — Real but orphaned: tested logic with no UI wire to it
Several features have fully tested underlying logic that Home simply never calls:
- `mobilityForMuscles` (rest-day suggestions) — tested, unused. Home shows static placeholder text instead.
- `chooseDifferentDay` / `logChosenDay` — tested, no UI trigger exists.
- `shouldPromptLongGap` / `jumpToDay` / `weekdaySuggestedDay` — tested, no dialog exists.

These are cheap to close — the hard part (correct logic) is done and proven. What's missing is strictly wiring, not design or logic work.

### Tier 3 — The actual gap: nothing connects "I worked out" to "this day is done"
This is the one thing blocking almost everything else from being real:
- `completeTrainingDay()` exists, is tested in isolation, and is **never called from anywhere in the app**.
- "Start Session" on Home is a link to Program browsing, not a real session.
- Exercise Detail's set logger writes to `exerciseHistory` per-exercise, but nothing aggregates that into "today's session is done" or advances the cycle pointer.
- Because of this, the `completed` calendar status **cannot currently be produced by any real user action** — only `missed` and `recovery` can happen from actual use.
- **History and Progress are empty-shell placeholders** that don't read any store at all. This was always correct given nothing produces real completed-session data yet — but it means none of Tier 1's real, tested work is visible anywhere in the app except Home's week strip.

## The roadmap, in dependency order

### Stage 1 — Close the loop: real Active Session → real completion
**This is the keystone. Everything else downstream depends on this existing.**

Build the actual session flow: today's exercise list in sequence (reuse the existing set-logger UI from Exercise Detail — that component and its `exerciseHistory` writes are already solid), a rest timer, the cardio finisher using the already-built `CardioLogger`, and a **Finish Workout** action that calls `completeTrainingDay()` for real. This is largely assembly of already-working pieces, not new invention — the set logger, the cardio logger, and the completion function all separately work; nothing currently connects them into one flow.

**Verification for this stage, given everything that's happened so far:** don't trust a "done" report here on reasoning alone. Specifically confirm, by clicking through it and checking IndexedDB after a reload (the same pattern that caught the onboarding bug): a finished session writes `calendar[date].status = "completed"`, `cycle.pointerIndex` advances, and the write survives a reload — not just an in-session React state change.

### Stage 2 — History: build the real display against data that now exists
Once Stage 1 produces real `completed` days, build History's actual calendar/heatmap and session list, reading `calendar`, `sessions`, and `exerciseHistory`. This was always Stage 2's natural position — it just makes sense now that there's something real for it to show.

### Stage 3 — Wire the orphaned Tier 2 features into Home
Batch these together since the hard part (logic) is already done and tested for each:
- Rest-day mobility suggestions (swap the placeholder text for the real `mobilityForMuscles` call)
- "Choose a different day" UI on Home
- The long-gap prompt dialog

Lower risk than Stage 1, but still verify each with an actual click, not just "the function is imported now."

### Stage 4 — Progress: real analytics
PR Wall, volume charts, period comparison, plateau detection — all need Stage 1's real sessions to be meaningful. Building this before Stage 1 would mean displaying analytics over data that still can't reflect a real completed workout.

### Stage 5 — Deferred, lower urgency
Equipment display on exercise cards, the injury-tag swap-confirmation prompt, a real Add Exercise form with AI-draft-assist, CSV bulk add, the PR ticker and deload banner on Home, backdating confirmation, two-sessions-one-day handling, ad-hoc sessions on Rest days, PWA installability polish. None of these block anything else — pick them up opportunistically or when they start to matter.

## Standing process rule, given the last several rounds

Any change that touches a **write path** — a button that's supposed to persist something — gets verified with the same pattern that finally caught the onboarding bug: perform the action, check the actual IndexedDB value (not just what renders), **reload**, and check it again. A value that's correct immediately after a click but wrong after reload has been the exact shape of three separate bugs in this build already. "The tests pass" and "I traced the code and it looks right" are both useful, but neither one is a substitute for that specific check when a persistent write is involved.
