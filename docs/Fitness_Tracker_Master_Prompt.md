# Master Prompt v2: Personal PPL/Upper-Lower Fitness Tracker App

## Role
Act as a senior full-stack product engineer paired with an experienced strength coach. Build a **multi-page** web app — a complete gym companion: program viewer, form/technique reference, video demo lookup, live workout logger, and progress analytics — pre-loaded with the user's actual PPL–Rest–Upper–Lower–Rest program.

## Product Vision
A program-first app, not a generic "add any exercise" tracker. It opens knowing today is (say) Pull day, shows exactly what's due, lets the user log it in seconds mid-set, and quietly builds a real progress history behind the scenes. Reference material (form cues, mistakes, alternatives, video) and deep analytics live in their own dedicated spaces instead of being crammed under one scrolling page.

---

## 1. Architecture: multi-page, not a single scroll

**Technical reality check:** this is built as one React artifact file (that's how this environment works — there's no separate backend or multi-file deployment). "Multi-page" here means a proper **in-app navigation system** — a persistent bottom tab bar (mobile) / sidebar (desktop) that switches between fully distinct views, plus stack-style drill-downs (e.g., Library → Exercise Detail) and a full-screen modal flow for an active workout session. It will feel and behave like a multi-page app even though it's technically one file with client-side routing via component state (no URL routing needed since there's nothing to deep-link to across sessions).

### 1.1 Deployment plan — Claude artifact prototype → Vercel production

Since you're hosting this on Vercel, treat the build as two stages, not one:

**Stage A — prototype here, in this conversation.** Built as a Claude artifact first, because it's the fastest way to iterate on flows and UI with me before committing to a real project structure. Uses the artifact's sandboxed storage API as a stand-in for real persistence.

**Stage B — production port to Vercel.** Once the prototype's flows are validated, the component code gets restructured into a real deployable project. This changes several things that were genuine constraints *only* inside the artifact sandbox:

| Constraint in the artifact prototype | What actually happens once hosted on Vercel |
|---|---|
| No independent URL/install, opened only through Claude | Real URL, and a proper installable PWA (manifest + icon + "Add to Home Screen") — this is worth doing since it makes the app feel native at the gym |
| No service workers / no push notifications | Both become genuinely possible: a service worker enables an offline-capable app shell, and real scheduled reminders become buildable — though note true "notify me even if the app's been closed for days" still needs a small backend (Vercel Cron + Web Push), not just client code. Treat that specific piece as a Phase 2 add, not day-one — everything else (install, offline shell, in-app reminders) is day-one reasonable |
| Artifact's `window.storage` (200-char keys, 5MB/key, rate-limited) | Replaced with **IndexedDB** in the browser (via a small wrapper like `idb`) — much higher storage ceiling, no artificial rate limit, well-suited to years of logged history |
| "Watch demo" opens a YouTube *search* (no embedding possible in the sandbox) | Can genuinely embed a real YouTube **iframe player** inline on the Exercise Detail screen now — still an embed (not downloading/hosting the video ourselves), so no copyright issue, just a real inline player instead of a link out |
| No cross-device sync, export/import was the only bridge | Still true **by default** — a static site with IndexedDB storage keeps data local to one browser, same as before. Real multi-device sync is now realistically buildable (Vercel + a small database + light auth) if you want it, but it's a genuine scope addition, not something hosting gives you for free. **Recommendation: ship v1 as local-only (matches everything already spec'd — no accounts, no login), and treat cross-device sync as an explicit Phase 2 decision**, not a default

### Top-level modules (tabs)
1. **Home** — today's dashboard
2. **Program** — full plan + exercise library
3. **Progress** — analytics, PR Wall, comparisons, trends
4. **History** — calendar/log of past sessions
5. **Settings** — preferences, data, Apple Health (Phase 2)

### Non-tab flows (pushed on top, not permanent nav items)
- **Active Workout Session** — full-screen, entered from Home's "Start Workout," exited via Finish or explicit back
- **Exercise Detail** — pushed from Program/Library or from within a session
- **Session Detail** — pushed from History, allows editing past logged sets

---

## 2. Page-by-page feature breakdown

### 2.1 Home (dashboard)
- Today's day card — reflects the program's **cycle pointer**, not the raw calendar date (see Section 2.7), color-coded Push/Pull/Legs/Upper/Lower/Rest, with one-tap **Start Workout**. After a missed day, this card shows the pending day with a small note ("Picking up your missed Pull day") instead of silently jumping ahead
- On any scheduled **training** day (not Rest), a secondary, lower-emphasis action: **"Feeling sore from yesterday?"** — see Section 2.8 for the full flow this triggers
- Weekly overview strip — 7 cards showing done / today / upcoming
- Per-muscle **recovery countdown** ("Chest: last trained 2 days ago")
- Rest-day view swaps the "Start Workout" CTA for **rest-day mobility suggestions** matched to what was trained most that week
- Quick PR ticker ("New PR last Tuesday: Deadlift 52.5 kg") linking to the PR Wall
- Deload nudge banner when due (~every 6 weeks of continuous training)

### 2.2 Program (plan + library)
- Full 7-day cycle laid out, matching the structure and colors of the source program document
- Exercise library: every exercise as a card — target muscle(s), equipment, sets×reps×weight (kg & lb), setup notes
- Search/filter by day, muscle group, or equipment
- Tapping a card opens **Exercise Detail**:
  - Form pictogram (start → finish)
  - **Muscle-map diagram** highlighting which muscles this specific exercise targets — quick visual context beyond the text description
  - Form cues / common mistakes / alternative (same color-coded cards as the source document: green/red/blue)
  - "Watch demo" — opens a generated YouTube search for that exact exercise in a new tab (no real video hosting is possible here — flagged as a known v1 limitation, not a bug)
  - Static "Alternative" exercise link, **plus** a dynamic **"this machine's busy" swap** usable live during a session
  - Difficulty/injury tag (e.g., "lower-back sensitive") that powers a **suggested** swap prompt when this exercise comes up in a future session — never a silent automatic substitution (see Section 6.2a)
  - Personal notes field, persisted per exercise
  - Mini history chart + this exercise's PR
  - Glossary tooltips the first time RPE/RIR/AMRAP/1RM appear anywhere in the app

### 2.2a Adding new exercises later, with the same rigor

`program-data.ts` is the seed data, not a ceiling — the data model needs to make adding a new exercise next year just as complete as the 44 that shipped on day one, without you having to hand-write cues and mistakes from scratch every time.

**Data model: decouple the exercise library from program-day assignment.** In the real app's schema (not the flat seed file), split this into two normalized structures:
```
exercises:   { [id]: { name, muscles, equipment, cues, mistakes, alternativeId, icon, prType, difficultyTags, ... } }   // day-agnostic
assignments: { [dayKey]: [ { exerciseId, sets, reps, weight, isWarmup, isSecondSession } ] }                          // which days use which exercises, and how
```
This is a genuine improvement over the seed file's structure (where `day` lives on the exercise itself) — it means adding a new exercise to the library is fully independent of deciding which day(s) it belongs on, and it's also what would let you support a second saved program down the line without restructuring anything.

**The schema itself is the quality gate.** Every non-optional field on the `Exercise` type (`cues`, `mistakes`, `muscles`, etc.) means a new entry literally cannot be saved without them — TypeScript won't compile, and the in-app "Add Exercise" form should mirror that same required-field set, not a looser ad-hoc form.

**An AI-draft-assist button on the "Add Exercise" form** is the actual answer to "same rigor," not just the schema. Given a name, equipment, and target muscle, a "Draft cues, mistakes & alternative" button calls an LLM (the same Anthropic API pattern available for AI-powered artifacts) to generate a first-pass set of form cues, common mistakes, and a same-muscle alternative — the same kind of content written by hand for the original 44 — which the user then reviews and edits rather than starting from a blank field. This is meaningfully different from just "let the user type notes": it's the same trainer-expertise drafting step this whole spec was built through, made repeatable in-app.

**Pictograms don't need full custom automation.** Hand-drawn stick-figure pictograms (like the 12 built for the core lifts) aren't something to auto-generate reliably in-app. A pragmatic fallback: a small set of **generic movement-pattern icons** (push / pull / squat / hinge / curl / carry) that a new exercise gets assigned to at creation time, rather than leaving it with no visual at all. A fully custom pictogram for a new staple lift is still something to come back and commission specifically (the same script-based approach used for the original 12), not a v1 requirement.

**Bulk addition path:** the CSV import already speced in Settings (§2.6) doubles as a bulk "add many new exercises at once" pathway if drafted in a spreadsheet using the schema's fields as columns — useful if a whole new block of exercises gets added at once rather than one at a time.


### 2.3 Active Workout Session (full-screen flow)
- Lists today's exercises in order; prescribed sets/reps/weight shown, actual logged alongside
- **"Same as last time"** one-tap fill per set
- Editable **rest timer** (sound/vibration-style visual alert at 0), duration defaults longer for compounds
- Edit or delete a logged set after the fact
- AMRAP/failure-set flag; optional **RPE (1–10)** tap after each set
- Warm-up ramp calculator surfaced before compound lifts (40/60/80% ramp)
- Plate-math helper for barbell lifts
- **Form-refresher nudge**: every ~8–10 sessions, resurface deadlift/squat cues before the first working set, unprompted
- Mid-session exercise reorder/skip; dynamic equipment-busy swap (session-only, doesn't edit the underlying program)
- Actual **cardio logging** for the day's finisher (duration, distance, incline) instead of static text
- Session notes field (free text)
- "Finish Workout" → summary screen (volume, duration, PRs hit, comparison to last time this day was done), plus a **progressive overload suggestion for next time** — e.g., "You hit 3×15 cleanly at 25 kg on Row — try 27.5 kg next Pull day," generated from the program's own stated progression rule (add weight or reps, not both) rather than a generic algorithm

### 2.4 Progress (analytics)
- Per-exercise strength chart — top-set weight / estimated 1RM (Epley formula) over time
- **PR Wall** — dedicated trophy-case screen, all-time best per lift, browsable, not just a passing toast
- Weekly volume per muscle group, checked against the program's frequency-check logic
- **Period-over-period comparison** — last 4 weeks vs. the 4 before, per lift and per muscle group volume
- **RPE/fatigue trend line** — separate from weight-based plateau detection, tracks effort creeping up at the same load
- **Plateau detector** — flags a lift with no progress in ~4 sessions, suggests deload or exercise swap
- Body-weight / body-measurement log (optional, separate section)
- Achievement badges (first PR, 10 sessions logged, 4-week streak, etc.)
- Strength-standard benchmarking against general novice/intermediate/advanced norms — explicitly labeled as population reference, not personalized advice

### 2.5 History (calendar & log)
- Calendar/streak heatmap — completed / **missed** / rest, month view (see Section 2.7 for exactly how "missed" is determined)
- Session list, searchable/filterable by exercise, date range, or "PRs only"
- Tapping a session opens **Session Detail** — full log for that day, editable
- Ad-hoc/freestyle session entries (travel, hotel gym) appear here too, tagged distinctly from program days

### 2.6 Settings
- Units toggle (kg/lb), theme toggle (dark/light)
- Cycle start date (recalculates "today's day")
- Rest timer defaults per exercise type
- Injury/deload **pause mode** — temporarily reduces app-wide targets for a set period without wiping streaks or history
- Voice-guided mode toggle (browser text-to-speech announces next set / rest-over — no network dependency)
- Data: full JSON export/import (backup, with merge-vs-replace choice — see Section 6.5), a separate **CSV export of workout history** for opening in a spreadsheet (distinct purpose from the JSON backup — this one's for your own analysis, not for restoring into the app), printable one-page program reference, "reset program to default," "clear all history" (both behind a confirmation step)
- Optional one-time **CSV import for pre-existing tracking data** (a spreadsheet or another app's export) during onboarding — lower priority than the app's own JSON backup format, but genuinely useful if there's already months of lift history sitting in a notes app or spreadsheet that shouldn't have to be re-entered by hand
- **Apple Health** — entry point for Phase 2 (see below); shown now as "Coming soon" so the settings page doesn't need restructuring later

### 2.7 Missed-day detection & auto-shift logic

This is the rule that governs "what day is it in the program," and it deliberately does **not** just follow the calendar:

- The cycle is tracked as a **pointer to a position in the 7-day sequence**, not as a fixed mapping from calendar dates to days. A separate `lastCompletedDate` tracks when the pointer last moved.
- **Rest days advance automatically** at midnight — there's nothing to log, so the pointer just moves on to the next day in the sequence.
- **Training days (Push/Pull/Legs/Upper/Lower) do not advance until completed.** If today was supposed to be Pull and no Pull session gets logged, the pointer stays on Pull.
- **When a training day's calendar date passes uncompleted**, that calendar date gets tagged **"Missed: [Day]"** in the History calendar — once, permanently, as a record of what happened (or didn't) on that real date. It does not get re-tagged again on subsequent blank days; those show as neutral/blank, not additional misses.
- **The next time the user completes a workout — on whatever date that turns out to be — it fills the pending day**, not "today's" raw-calendar day. So if Pull was due Monday and actually gets done Wednesday, Wednesday's session is logged as the Pull day, Monday is marked "Missed: Pull," and Tuesday stays blank (an unplanned extra rest, not flagged as anything). The cycle then continues normally from Wednesday: Thursday → Legs, and so on. Everything after the completion point shifts forward by the size of the gap — the schedule doesn't try to cram missed days back in or silently skip them.
- **Long-gap handling:** if more than ~5 days pass with no session logged (illness, travel, life), the next time the user opens the app, prompt a choice rather than silently forcing the old pending day: *"It's been a bit — pick up at [Pending Day] where you left off, or jump back in with a fresh [natural day-of-week-based suggestion]?"* Either choice is valid; this just avoids trapping the user on a stale pending day they've mentally moved past.
- Home's "today" card reflects the **pointer**, not the calendar — so after a miss, the app is already showing the right day to walk in and do, with a small contextual note ("Picking up your missed Pull day") rather than pretending nothing happened.

Data model addition:
```
cycle:    { pointerIndex: 0-6, lastCompletedDate }
calendar: { [date]: { status: 'completed'|'missed'|'rest'|'adhoc'|'recovery'|'blank', dayKey } }
```

### 2.8 Soreness → active recovery swap

A deliberate, trainer-approved auto-regulation feature — distinct from both the missed-day logic (Section 2.7, which handles *unplanned* absence) and injury pause mode (Section 2.6/6.7, which handles a *longer* load reduction). This is a same-day, in-the-moment call the user makes on purpose, and it should never look or feel like a failure in the UI.

**Flow:**
1. On a scheduled training day, tapping "Feeling sore from yesterday?" opens a small confirmation sheet with brief trainer framing: *"Soreness happens — light cardio helps you recover faster than sitting still. We'll log today as active recovery and move [Day]'s workout to tomorrow."*
2. Confirming does three things atomically: (a) logs today as an **active recovery** day rather than the scheduled training day, (b) opens the existing cardio-logging component (same one used for program cardio finishers — duration, distance, incline) so they can record what they actually did, with a "skip logging specifics, just mark it done" escape hatch for zero friction, and (c) leaves the cycle pointer exactly where it was — the pending training day simply moves to the next calendar day, mechanically identical to the missed-day shift in Section 2.7, but voluntary and immediate rather than discovered after the fact.
3. **Calendar treatment is different from a miss on purpose**: that date gets tagged **"Active Recovery"**, not "Missed" — a distinct status with its own calming color (Section 4 of the Design Spec), since this is a good training decision, not an absence. It also doesn't trigger the long-gap prompt (Section 6.1) even across several consecutive sore days, since each one is explained and logged, not silent.
4. **Change of mind, same day**: if the user taps the sore-day button but then decides to lift after all, before starting any other session, the swap is fully reversible — revert the day's status and let "Start Workout" resume normally. Once a *different* day's session has been logged on top of it, the swap is final (consistent with the general rule against silently rewriting settled history).
5. **Repeated soreness**: tapping this on consecutive days for the same pending training day is allowed and expected (soreness doesn't always resolve in 24 hours) — the pending day keeps shifting forward, each day logged individually as its own Active Recovery entry.
6. **Streak treatment**: an active recovery day counts as "showed up and did something" for streak purposes — it does not break a consistency streak the way an unlogged miss would, since the user made an explicit, healthy choice rather than skipping.
7. Not offered on days already scheduled as Rest — there's nothing to swap out; voluntary cardio on a Rest day is just an ad-hoc session (Section 2.2/6.2).

---

## 3. Apple Health / Apple Watch sync — Phase 2

**Deferred until the core app is built and working**, per your instruction. Flagging the real technical constraints now so expectations are set correctly before we get there — **important: hosting on Vercel does not change this section at all.** HealthKit access is gated by iOS app sandboxing, not by whether a website is hosted somewhere real vs. running in an artifact. A real URL doesn't unlock it.

- This app runs in a browser — it has **no access to Apple's HealthKit**, which is an iOS-native, in-app-only framework. There is no web API that reads HealthKit data directly, on any platform, from any browser, hosted or not.
- Realistic paths, roughly in order of effort vs. quality:
  1. **Manual export/import**: Apple's Health app can export an XML archive of all HealthKit data; a Phase 2 feature could let you upload that export (or a pre-filtered CSV) and the app parses out workout/heart-rate/weight data to merge into its own history. Manual, but fully doable with no native app. Being on Vercel makes this slightly nicer since parsing a large XML export could happen server-side in an API route instead of in-browser, but it's a convenience, not a new capability. **Dedup consideration:** if a cardio session was already logged manually in-app (e.g., today's treadmill finisher) and the same session also appears in an imported Health export, the import needs to detect the overlap (by date + type + rough duration match) and ask before creating a duplicate entry, rather than double-counting cardio volume.
  2. **Shortcuts bridge**: an iOS Shortcut (built once, run manually or on a schedule) could pull specific HealthKit metrics and hand them off in a format this app can import — still not "live sync," but far less manual than a full export each time.
  3. **True live sync** would require a real native iOS companion app (Swift, HealthKit entitlements) — that's a genuinely separate project regardless of how this web app is hosted.
- Recommendation: build Phase 2 as the CSV/export-import path first (real value, no new infrastructure), and only look at a native companion app if that proves limiting.

---

## 4. UX / Design requirements
See the companion document **"Fitness Tracker — UI/UX & Design Spec"** for full detail (pages, flows, color system, typography, components). Summary requirements:
- Mobile-first, scales cleanly to desktop with a sidebar instead of a bottom tab bar
- Logging a set is near-instant — large tap targets, steppers over typing
- Day-accent color coding and cue/mistake/alternative color cards carried over from the source program document
- Deliberately designed, not default-component-library look
- Every page has a considered empty/first-run state
- Once hosted: a proper PWA install experience (manifest, icons, splash screen matching the dark theme) so "Add to Home Screen" feels like installing a real app, not bookmarking a page

## 5. Technical notes

**Stack recommendation for the Vercel production build:** Next.js (App Router), deployed on Vercel — even though v1 has no backend, Next.js gives a clean on-ramp to add API routes later (Health-export parsing, sync, Web Push cron) without a framework rewrite. Plain Vite+React is a lighter alternative if you're confident you'll never want server routes — either works, Next.js just costs less to change your mind later.

- Client-side app; in-app tab/stack navigation (no server-rendered routing needed for v1, though Next.js pages can still map 1:1 to the tabs for clean URLs like `/progress`, `/history` — nice to have, not required)
- Cross-session data via **IndexedDB** (wrapped with a small helper like `idb`), personal to that browser — see Section 5.1
- Charts via `recharts`; icons via `lucide-react`
- PWA setup: manifest.json (name, icons, theme color matching the dark palette), service worker for offline app-shell caching (via `next-pwa` or a hand-rolled worker)
- Rough state shape:
  ```
  program:  { days: [...] }                          // editable copy of the base plan
  history:  { [exerciseId]: [ {date, sets:[{weight,reps,rpe?,toFailure?}], prescribed} ] }
  sessions: [ {date, dayKey, type:'program'|'adhoc', entries:[...], cardio:{...}, durationMin, notes, complete} ]
  prefs:    { units:'kg'|'lb', theme:'dark'|'light', cycleStartDate, restTimerDefaults, voiceGuided:bool, pauseMode:{active,until} }
  prs:      { [exerciseId]: {weight, reps, est1RM, date} }
  badges:   [ {id, earnedDate} ]
  notes:    { [exerciseId]: string }
  soreness: { [date]: { markedSore:true, originalDayKey, cardioLogged:{...}|null, reversedSameDay:bool } }
  ```
- Video lookup = real embedded YouTube iframe player on Exercise Detail (a genuine embed, not hosted/downloaded video — no copyright issue) — this is an upgrade over the artifact prototype, which could only link out to a search

### 5.1 Storage: IndexedDB (production) vs. artifact storage (prototype)
The Stage A prototype uses the Claude artifact's sandboxed storage API (200-char keys, 5MB/key, rate-limited — design notes for that stage only, kept here for reference): batch writes per exercise rather than per keystroke, wrap first-ever reads in try/catch since missing keys throw rather than returning null, and treat two-tabs-open as a real conflict case since there's no server-side merge.

**For the Vercel production build, storage moves to IndexedDB**, which changes the constraints:
- Storage ceiling is far higher (typically hundreds of MB+, browser-dependent) — years of lift history is a non-issue.
- No artificial rate limit — but batching writes sensibly (per completed exercise, not per keystroke) is still good practice for performance, not a hard requirement anymore.
- **New consideration specific to IndexedDB**: Safari's private browsing mode restricts or disables IndexedDB entirely in some versions. Detect this on load and show a clear one-time notice ("private browsing limits saved data — your workouts may not persist between visits") rather than silently failing to save.
- **New consideration**: IndexedDB requires a version/schema migration path (`onupgradeneeded`) from day one, even though v1 has only one schema version — retrofitting migrations after users already have real data is painful; design the schema versioning hook now even if it does nothing yet.
- Two-tabs-open is now a more realistic scenario (a real bookmarked site invites exactly that) — the warn-on-focus-if-stale fix from Section 6.5 applies more, not less.

## 6. Edge cases & resilience rules

Brainstormed systematically across every feature area. Each one includes the fix, not just the problem — this section is the actual hardening spec, not a list of caveats.

### 6.1 Cycle pointer & scheduling
- **Two sessions logged in one calendar day** (catching up a missed day, then also doing today's) — allowed explicitly; the pointer advances once per completed training day regardless of how many happen on the same date, and both sessions appear separately in History.
- **User wants to train out of sequence on purpose** (e.g., do Legs before Pull for equipment reasons) — "Start Workout" always defaults to the pending day, but a secondary "choose a different day" option lets them log any day intentionally; doing so still advances the pointer past whatever was pending (with a one-line confirmation: "This will mark [pending day] as skipped, not missed — continue?").
- **Changing the cycle start date after history already exists** — disabled/hidden once the first session is logged; the pointer, not the start date, governs everything from that point on. Start date only matters for a brand-new install.
- **First-ever launch** — there is no "missed day" possible before the user has explicitly started. Onboarding ends with an explicit "Start my program today" action; nothing is backdated or auto-tagged before that moment.
- **Timezone changes / travel** — "day boundary" logic uses the device's local midnight at the time of check, recomputed on each app open rather than a stored timer, so a timezone jump can shift exactly one boundary by a few hours at worst, never duplicate or delete a day.
- **Daylight saving transitions** — day-boundary checks use calendar date comparison, not elapsed-hours math, so a 23- or 25-hour day never miscounts.
- **Backdating a manual log entry into the past** — allowed for correcting mistakes, but if it lands on a date already tagged "Missed," the app asks explicitly whether to convert that tag to completed (never silently rewrites history).
- **Voluntary workout on an auto-advanced Rest day** — logged as an ad-hoc session; does not touch the pointer, since the program didn't call for training that day.
- **Soreness swap used, then the user changes their mind later the same day** — fully reversible up until another session gets logged on top of it (see Section 2.8); after that, the swap is treated as settled history like anything else.
- **Soreness swap tapped several days in a row for the same pending day** — allowed; each day logs its own "Active Recovery" entry rather than one status getting silently overwritten, and none of them count toward the long-gap prompt's "unexplained absence" trigger, since each is an explicit, logged choice.
- **Soreness swap and a missed day landing on the same pending training day** — mutually exclusive by construction: the moment either one is logged for that date, the date has a status, so the other can't also apply to it. If the user ignores the sore-day prompt entirely and neither logs cardio nor lifts, the day still falls through to the ordinary "Missed" tagging at day's end — the button offers a better outcome, it doesn't create a third silent state.

### 6.2 Ad-hoc sessions & equipment swaps
- **Ad-hoc session on a day with a pending program day** — independent by default (doesn't fulfill the pointer); a checkbox ("count this toward my pending [Day]") lets the user explicitly apply it if that's what they intended.
- **Live "equipment's busy" swap mid-session** — history and PRs are recorded against the exercise actually performed, not the originally prescribed one, so progress tracking never gets muddied between the two.

### 6.2a Editing the program itself
- **Editing the program while a session is actively in progress** — blocked with the same pattern as clearing history mid-session (Section 6.5): finish or discard the active session first, so the exercise list a session started with can't shift underneath it mid-log.
- **Editing a day down to zero exercises** — prevented at the editor level with a clear message ("A training day needs at least one exercise — mark it as Rest instead if you want a true day off"), rather than allowing a "Start Workout" that opens onto an empty list.
- **"Reset program to default" scope** — explicitly restores only the exercise list/schedule structure to the original program; it never touches logged history, PRs, personal notes, or badges. That's what the separate, more seriously-confirmed "Clear all history" action is for — the two are never merged into one button, since "I want the schedule back to normal" and "I want to erase my progress" are very different intents that shouldn't share a single confirmation.
- **A pain-flagged exercise's alternative** — presented as a **prominent suggestion the user confirms**, never a silent automatic substitution. If Tuesday's Pull day quietly showed different exercises than expected because of a flag set weeks ago, that's confusing, not helpful — the app should surface "You flagged discomfort here before — swap in [Alternative] today?" and let the user decide each time it comes up, not just do it for them.

### 6.3 Set logging & data entry
- **App/phone closes mid-set** — every individual set autosaves on entry, not just on "Finish Workout"; reopening resumes exactly where the session left off.
- **Accidental double-submit** (double-tap) — logging is idempotent per tap event; a set can't be duplicated by a fast double-press.
- **Zero or negative values** — negative numbers are always rejected. Zero weight is valid (bodyweight movements) but zero reps requires an explicit "0 reps / failed set" confirmation rather than silently accepting it as a normal log.
- **Unusually large numbers** (fat-fingered extra zero) — soft warning ("500 kg on Tricep Pushdown — that's way outside your usual range, confirm?") rather than a hard block, since some machines genuinely do have high numbers (leg press).
- **Editing a past set after PRs/analytics were already computed from it** — editing any historical set triggers a recompute of that exercise's PR history and any dependent charts, not just a silent edit in isolation.
- **Deleting every set from an otherwise-completed session** — the session automatically reverts from "completed" to "missed" (or is removed entirely, user's choice) rather than sitting in History as a phantom completed-but-empty day.
- **Unit toggle changed mid-history** — all values are stored canonically in kg internally regardless of display preference; switching kg/lb is a display transform only and never rewrites stored data, so historical entries stay accurate no matter when the toggle changes.

### 6.4 PRs, 1RM estimates & analytics
- **Bodyweight exercises** (push-ups, lunges) — "PR" means most reps completed, not a weight number; the PR Wall and detection logic branch per exercise type.
- **Assisted pull-up machine** — assist weight is inverse (less assistance = harder rep); PR logic explicitly flips direction for this exercise type rather than flagging every improvement as a new "high."
- **Estimated 1RM at high rep counts** — the Epley formula gets unreliable above ~12 reps, and most of this program's isolation work is done at 12–15 reps. The app caps 1RM estimation to sets of ≤12 reps and instead tracks **top-set volume (weight × reps)** as the progress metric for higher-rep work, clearly labeled per chart so it's obvious which metric is being shown.
- **Comparing PRs across different rep counts** (15 reps @ 20 kg vs. 12 reps @ 22 kg) — PR comparisons use estimated 1RM or volume, never raw weight alone, so a lower weight at higher reps can correctly still register as a genuine strength PR.
- **Warm-up sets** — explicitly flagged sets (like the Deadlift warm-up sets) are excluded from PR detection and volume totals, but still visible in the session log.
- **Deload weeks** — a session (or Settings' pause mode) flagged as a deload suppresses plateau-detector and "regression" warnings for that window, so an intentional lighter week never reads as a red flag.
- **Renaming or editing an exercise in the program** — exercises have a stable internal ID separate from display name; renaming never orphans historical data.
- **Removing an exercise from the active program** — history tied to it is preserved and still viewable from Progress/History, just no longer shown as an active program item.
- **A set logged at exactly 1 rep** — treated as an actual observed 1RM, not run through the Epley estimate (which would inflate a true 1-rep max by ~3% for no reason, since the formula is only needed to *estimate* what wasn't directly tested).
- **A "to failure" set that falls short of the prescribed reps** (aimed for 10, failed at 7) — PR detection and volume totals always use the actual completed reps, never the prescribed target, so a failed set is never silently credited as if it succeeded.
- **Exercises that work more than one muscle group** (e.g., rows hit back primarily but biceps secondarily) — weekly volume-per-muscle-group tracking uses a primary/secondary muscle weighting per exercise (full credit to the primary muscle, partial credit to secondaries), matching how the source program's own frequency-check table already reasons about overlap, rather than crediting each exercise to a single bucket and undercounting real secondary stimulus.
- **What "weekly" means for volume/frequency tracking** — always a rolling trailing-7-calendar-day window anchored to "today," never a fixed Monday–Sunday calendar week. The training cycle can drift away from calendar weeks the moment a day gets missed or shifted (Section 2.7), so calendar-week bucketing would silently misrepresent actual training frequency.

### 6.5 Data integrity & storage
- **A save fails** (storage write error) — the UI shows an explicit "couldn't save — retry" state rather than silently losing the set; nothing is marked complete until a save actually succeeds.
- **Importing a malformed or corrupted backup file** — validated before anything is applied; a bad file is rejected with a clear message and the existing data is left completely untouched.
- **Importing a backup from an older app version** — the export format is versioned; older versions are migrated on import, and an unrecognized future version is rejected rather than partially applied.
- **Importing a backup when local data already exists** (e.g., restoring onto a device that's already logged a few ad-hoc sessions) — the import flow explicitly asks **"Merge with existing data" or "Replace everything"** rather than silently assuming either; merge is date/exercise-aware so it doesn't duplicate entries that exist in both.
- **Clearing history while a workout is actively in progress** — blocked with a clear message until the active session is finished or explicitly discarded.
- **Two browser tabs open at once** — the app detects a state mismatch on tab focus (via the storage layer's version) and warns before overwriting, rather than silently letting the last tab closed win.

### 6.6 Rest timer & voice mode
- **Tab backgrounded/phone locked during rest** — the timer computes remaining time from a stored end-timestamp on resume, not from an interval that may have been throttled or paused by the browser, so the countdown is always accurate when you look back at it.
- **Two timers triggered in quick succession** — starting a new rest timer always replaces the previous one, with a brief visual confirmation, rather than running two silently in parallel.
- **Voice mode on an unsupported browser/device** — feature-detected on load; if the Web Speech API isn't available, the toggle is hidden rather than present-but-broken.

### 6.7 Pause mode & injury handling
- **A missed day occurs while pause mode is active** — missed-day tagging and the long-gap prompt are both suspended during an active pause window, since the absence is intentional, not a lapse.
- **Streaks during pause mode** — streak counters freeze (not reset) for the pause duration, then resume from where they left off.
- **Pause mode's end date passes** — auto-expires with a gentle re-engagement prompt ("Ready to get back to full loads?") rather than silently reverting.

### 6.8 Achievements & gamification
- **Importing history that already qualifies for badges** (e.g., restoring a backup with 20 past sessions) — badge eligibility is recomputed against the full imported history, not just tracked forward from the import moment, so nothing has to be "re-earned."

### 6.9 Plate calculator & unit conversion
- **Target weight isn't achievable with standard plate increments** — shows the closest achievable combination and states the small difference explicitly, rather than presenting an impossible instruction as if it were exact.
- **Target weight is below an empty bar's weight** (e.g., asking for 15 kg when the bar alone is 20 kg) — the calculator recognizes this and says so plainly ("lighter than an empty bar — try dumbbells or a machine instead") rather than showing negative or nonsensical plate math.
- **kg↔lb conversion producing ugly numbers** (20 kg → 44.09 lb) — display values round to the nearest sensible gym increment (0.5 lb / 0.5 kg), never a raw floating-point conversion.

### 6.10 Onboarding & data loss awareness
- **Uninstalling the browser app or clearing site data** — since there's no cloud account, this is total, permanent data loss. Settings surfaces a periodic, dismissible-but-recurring nudge to export a backup (e.g., monthly), and onboarding mentions this plainly on first launch rather than leaving it as a surprise later.

### 6.11 Data growth & long-term performance
- **History grows for months/years of daily logging** — History's session list and any per-exercise chart load a recent window by default (e.g., last 90 days / last 20 sessions) with an explicit "load more," rather than rendering the entire lifetime history array on every screen open.
- **Charts fed sparse or empty data** — every chart component (per-exercise strength chart, RPE trend, volume-by-muscle) is built to render a deliberate empty state ("not enough data yet — log a few more sessions") instead of crashing or drawing a broken/misleading line through missing points.
- **An exercise is shared across multiple days with different prescriptions** (e.g., Isolateral Flat Bench Press is a full working set on Push day but a deliberately lighter follow-up on Upper day) — history and PRs aggregate by the exercise's stable ID regardless of which day it was logged on, while "prescribed" values stay per-day-instance. This is intentional — one unified strength history per movement — and should be treated as a design decision, not a bug, when both day-instances show up against the same chart.

### 6.12 Data export privacy
- **The JSON backup file itself** — it's a plain, unencrypted file containing your full training history once downloaded. That's fine for personal backup, but Settings' export screen should say plainly that it's an unencrypted local file and it's on the user where they choose to save/share it — not implied to be a secure cloud backup.

### 6.13 Deployment & installability (Vercel-specific)
- **PWA install prompts differ by browser** — Android/desktop Chrome supports a native "install" prompt; iOS Safari does not support the same API and requires the manual Share → "Add to Home Screen" path. The app should detect iOS and show a short one-time instructional card instead of waiting for a prompt that will never fire there.
- **IndexedDB in Safari private browsing** — may be disabled or severely limited; detect on load and show a plain notice rather than silently failing to persist (already noted in Section 5.1, repeated here since it's specifically a "why didn't my data save" support problem once real people other than you could hit it).
- **Public URL, no login** — since v1 has no accounts, anyone with the URL could open the app and log their own (locally-stored, not shared) data. Not a privacy risk to your data, but worth knowing before sharing the link casually — Settings could offer a simple optional local passcode/lock screen if that matters to you, though it's not in v1 scope by default. Add `noindex` to the page head so search engines don't crawl and surface a personal fitness app.
- **First deploy checklist** (so nothing silently breaks on launch): HTTPS is automatic on Vercel, but confirm the manifest's icons and theme-color are in place before the first "Add to Home Screen," since retrofitting a PWA icon after users have already installed it doesn't retroactively update their home-screen icon.
- **Service worker caching a stale version after you push an update** — a classic PWA gotcha: without an explicit update strategy, users can get stuck on old cached JS indefinitely, silently missing bug fixes. Fix: the service worker checks for a new version on each app open and shows a small "Update available — refresh" banner rather than forcing a silent background swap (which can cause a confusing mid-session reload) or, worse, never updating at all.

### 6.14 App-shell integrity & session-safety hardening
- **Uncaught render error anywhere in the app** — wrap the whole app in a top-level React Error Boundary that shows a plain "Something went wrong — your data is safe, tap to reload" screen instead of a blank white page. A crash in one chart or one screen should never look like data loss.
- **Program structure edited while a day is "pending" in the cycle pointer** (e.g., a day gets added/removed/reordered) — the pointer references a stable **day key**, never a raw array index, specifically so restructuring the program can't silently point at the wrong day or throw on an out-of-range index. If the referenced day key is ever missing (e.g., deleted), fall back to the next valid day with a one-time explanatory notice, never a crash.
- **Logging a session that starts before midnight and finishes after it** — the session's date is locked in at start time and stays that day's session throughout, even if logging continues past midnight; it never silently reassigns itself to the new calendar day mid-session.
- **Phone screen auto-locks mid-workout** — request a Screen Wake Lock while an active session is open (with a Settings toggle to disable it for battery-conscious users), since a rest timer nobody can see because the screen locked defeats the point of having one.
- **Rest-timer alerts relying on vibration** — the Vibration API has no effect on iOS Safari at all (Apple doesn't implement it), so vibration can never be the *only* signal. The primary, always-reliable cue is a visual one (full-timer color change / screen flash); sound and vibration are bonuses layered on top where supported, not load-bearing.
- **Phone on silent/DND** — timer-end audio may simply not play; same conclusion as above — visual feedback carries the core requirement, audio is a nice-to-have.
- **Browser/gesture back navigation during an active session** — intercepted with a confirmation ("Leave this workout? Your progress is saved.") rather than either silently discarding the in-progress session view or the back gesture doing nothing at all. In-app navigation pushes real history entries so back behaves predictably everywhere else, too.
- **Double-tap on "Start Workout"** — guarded the same way as the double-tap-on-set fix in Section 6.3, so two overlapping session instances can't both open.
- **Multiple PRs for the same exercise within one session** — the PR record and celebration update live as each set is logged, but the celebratory moment fires once per exercise per session (not once per set), so a great session doesn't spam five consecutive trophy banners for the same lift.
- **Decimal weight entry on mobile** — weight inputs use `inputmode="decimal"` so the numeric keypad with a decimal point actually appears (half-kilo plates like 22.5 kg are common in this program and shouldn't require switching keyboards).
- **Printable program reference** — gets its own print stylesheet (light background regardless of app theme, no nav chrome, no dark-mode colors) rather than printing whatever's currently on screen and wasting a cartridge of dark background ink.
- **Keyboard/focus handling in bottom sheets and modals** — focus is trapped inside an open sheet (Tab doesn't leak to background content) and returns to the triggering element on close, for both accessibility and basic usability with an external keyboard on desktop.

---

## 7. Explicitly out of scope for this build
- Real video hosting (embedding a real YouTube player is now in scope on Vercel — see Section 5 — but hosting/uploading our own video files is not)
- Multi-user accounts / cross-device cloud sync — technically buildable now given real hosting (Vercel + a small database + light auth), but a deliberate v1 exclusion, not a limitation; revisit only if you actually want to log in from multiple devices
- Live Apple Health / wearable sync (Phase 2, manual-import path first — see Section 3; hosting doesn't change HealthKit's native-only access)
- Team/coach features, social feeds, AI-generated program rewrites

---

## 8. Decisions made directly with Cursor (post-handoff addendum)

Once implementation started, some product decisions got made directly in Cursor sessions rather than routed back through this doc first. Recording them here so this stays the actual source of truth instead of slowly diverging from what's really being built — anyone (including a future Cursor session, or me reviewing again later) should be able to read this doc alone and know what the app actually does.

- **App name: "Protocol."** Not decided anywhere earlier in this spec; now reflected in `package.json`, the sidebar branding, and presumably user-facing copy. If a tagline or positioning beyond "Strength training, planned and logged with precision" gets decided, add it here too.
- **Default weight unit: lb (not kg), default distance unit: mi (not km).** This is a real, deliberate call, not an oversight — flagging one implication to watch: the actual program data (`program-data.ts`) is authored in kg, so first-load numbers are converted-and-rounded display values, not the source numbers. Master Prompt §6.9's rounding rule (round to sensible gym increments, never raw floating-point conversion) matters more than usual given this default — verify it's actually implemented, not just specified.
- **Home-screen icon style: a "P"-only glyph** (matching the "Protocol" name), rather than a dumbbell/generic fitness icon. Applies to the PWA manifest icons and any favicon/touch-icon assets.
- **Add Exercise / Add Workout entry point exists now, as an intentional placeholder.** A dedicated page (`/program/add`) with disabled "Add exercise" / "Add workout day" actions ships ahead of schedule, specifically so the entry point exists in the nav even though the real implementation (the exercises/assignments schema split and AI-draft-assist button from §2.2a) lands in a later phase. When that phase arrives, build against §2.2a's normalized model — don't let the placeholder's simplicity quietly become the final data shape.

**Process note for anything that gets decided this way going forward:** when a real product decision gets made directly in a Cursor session rather than here first, it's worth a quick message back in this conversation to log it — cheap to do in the moment, expensive to reconstruct later from a chat log once it's been forgotten.

---

**Next step:** build against this spec and the companion UI/UX document.
