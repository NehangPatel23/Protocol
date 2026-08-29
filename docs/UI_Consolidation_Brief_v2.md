# UI Consolidation Brief v2 — Precision Technical Batch

Supersedes the first consolidation brief. This batch is a real leap forward — most of what was missing last time now exists somewhere in this set. This doc names exact winning variants, flags the one structural decision you need to make before this goes to Cursor, and lists what's still genuinely unresolved.

---

## Winning variant per screen — use these as the build target

| Screen | Use this variant | Why |
|---|---|---|
| **Home** | `home_today_1`, with `home_today_3`'s hero-card visual polish (glow, VOL badge) grafted onto the day card | `_1` has the deload banner, week strip with done/missed states, and the muscle-recovery chips — none of which exist in `_3`. But don't copy `_3`'s code directly — see bug note below. |
| **Program** | `program_library_1` | Clean list, muscle tags per exercise, day-identity-colored chips. `_2`'s photo-thumbnail cards look nice but don't fit a program built on real form cues, not stock gym photography. |
| **Exercise Detail** | `exercise_detail_1`, with `exercise_detail_2`'s 1RM calculator + full session-history table appended below as a "deep dive" section | `_1` has the muscle-map diagram, difficulty tags, cues/mistakes/alternatives cards, and a notes field — this is the one screen that most needed fixing and it's now essentially complete. `_2` alone regresses back to zero callout cards, so don't use it standalone. |
| **Active Session** | `active_session_1` | Circular glowing rest timer, SET/PREV/LBS/REPS table with a warm-up row, and a "Log RPE" dropdown — a genuinely good catch nobody asked for explicitly. |
| **Progress** | `progress_analytics_1` | Period-over-period comparison badge, a real plateau-detector callout, and per-actual-muscle volume rings (Chest/Back/Quads, not just Push/Pull/Legs). `_2`'s chart is broken/empty — don't use it. |
| **History** | `history_calendar_1` | Search/filter bar, tap-to-expand session detail, and sessions explicitly tagged "Active Recovery" — the soreness-swap feature is finally showing up correctly in the data model, not just as a Home button. |
| **Settings** | `settings_1` | Hits every item from the last brief: voice-guided mode, screen wake-lock, injury/deload pause mode, cycle start date, split JSON-sync vs. CSV-export, Apple Health placeholder. |

## Explicitly discard these, and why

- **`home_today_3`** — has a real rendering bug (a broken white gap sliced through the middle of the screen). Reference its hero-card *styling* only, don't copy its code.
- **`active_session_4`** — a full light-theme reskin, different app entirely. The "dim every exercise except the current one" pattern it uses is worth a mention for later, but not this screen, not this theme.
- **`settings_2`** — includes "Subscription: PRO ACTIVE," "Log Out," and "Delete Account," which implies a multi-user account/login model. That directly contradicts the v1 scope (no accounts, single local user) we've held throughout this whole spec. Don't let this one influence Cursor at all.
- **`progress_analytics_2` / `progress_analytics_3`** — the volume chart renders empty/broken in both.
- **`program_library_2` / `history_calendar_2`** — both are the same tier as last round's outputs; superseded by the `_1` variants above.

---

## The one decision you need to make before Cursor: Settings — tab or icon?

Every screen in this batch consistently uses **Home / Program / Active / Progress / History** as the five bottom tabs, with Settings moved to a top-right gear icon instead. That's not a random inconsistency this time — it's applied everywhere, which means it was a deliberate system decision, not an accident.

**Option A — keep our original spec:** Settings as the 5th tab, Active Session as a full-screen flow entered from Home's "Start Workout" (not a permanent nav destination). This is what the Master Prompt currently describes.

**Option B — adopt what Stitch consistently did:** Active Session as a persistent tab, Settings as a top icon. This is a legitimate, common pattern — Strava does exactly this.

**My recommendation: Option A, keep the original spec.** Strava's persistent "Record" tab earns its place because recording can run in the background while you do other things in the app (check a route, message a friend) — it's genuinely a parallel, ongoing state. Our Active Session isn't that: it's a focused, modal, one-thing-at-a-time flow, and our own edge-case rules (Section 6.14 in the Master Prompt) already treat leaving it mid-session as something to confirm, not something to casually tab away from. Giving it a permanent tab slot invites exactly the "wander off mid-set" behavior we designed against. Settings, meanwhile, is accessed rarely enough that a top icon is fine — but making it *harder* to find a screen you already built (wake lock, voice mode, pause mode) is the wrong tradeoff versus giving a permanent tab slot to something you're supposed to be actively leaving quickly.

If you disagree and want Option B, that's defensible too — just make the call explicitly rather than let Cursor infer it from conflicting screens, since this affects the navigation shell every single other screen sits inside.

## Other decisions worth making explicitly (smaller, but real)

- **Calendar coloring**: this batch colors History's calendar by **intensity** (Missed / Light / Heavy) rather than by **day-type** (Push/Pull/Legs colors) like our original Design Spec. Intensity is arguably more scannable at a glance; day-type carries more information. Pick one — don't let both ideas bleed into the build.
- **"Include Warmup Sets" toggle** (seen in `settings_1`): this correctly turns our silently-hardcoded "exclude warm-ups from volume/PR" rule into a visible, user-controlled setting. Worth explicitly confirming you want it user-facing rather than fixed — I think the toggle is the better call, flagging it since it changes a rule we'd previously written as non-negotiable.

## Still unresolved regardless of visual quality

- **The exercise data is still invented.** This batch uses "Barbell Back Squat," "Bulgarian Split Squat," "Romanian Deadlift," none of which are in your actual program, with made-up weights. No image-generation tool can know your real program unless it's fed in as structured data. This remains the top blocker before Cursor can build something that's actually *your* tracker and not a generic one — I can generate that real exercise data file now if you want it before moving to Cursor.
- Per-screen states we still haven't seen mocked anywhere: the long-gap "pick up where you left off" prompt, the update-available banner, the error-boundary crash screen, and the sore-day bottom sheet's confirmed visual (Home shows the *banner* prompting it, but not the sheet itself opened).

---

**Recommended next step:** lock in the Settings tab-vs-icon decision, say the word on the exercise data file, and this is genuinely ready to hand to Cursor alongside the Master Prompt and Design Spec.
