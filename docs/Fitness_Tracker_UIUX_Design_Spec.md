# Fitness Tracker — UI/UX & Design Spec

Companion document to the Master Prompt. This covers pages, flows, UI elements, color system, and typography in enough detail to build from directly.

---

## 1. Design principles

**A note on where this runs:** built and prototyped as a Claude artifact first, then deployed to Vercel as a real installable PWA. Design for the production reality — a real URL, "Add to Home Screen" on a proper manifest/icon set, offline app-shell caching — while keeping in mind v1 has no backend/accounts, so there's no server-driven push notification without an explicit future add (see Master Prompt §1.1). Any "reminder" in v1 is an in-app banner seen on next open, not a phone notification while the app's closed.

1. **Gym-usable, not just gym-themed.** One-hand operation, big tap targets, minimal typing, readable in bright gym lighting and readable one-handed while slightly out of breath.
2. **Data-dense but calm.** Lots of numbers (weights, reps, dates) — align them, use tabular figures, and let whitespace and color do the organizing instead of borders and boxes everywhere.
3. **Color means something.** Every color in this app maps to a day, a state, or a semantic meaning (success/warning/danger) — never decorative-only.
4. **Quiet by default, celebratory on purpose.** Everyday screens are restrained; PRs, streaks, and badges get a genuine moment (motion + color) precisely because everything else stays calm.

---

## 2. Information architecture

```
App
├── Home                          (tab)
│   ├── Today card → Start Workout → [Active Session flow]
│   ├── Weekly strip
│   ├── Recovery countdown
│   ├── Rest-day mobility panel (rest days only)
│   └── PR ticker → Progress/PR Wall
│
├── Program                       (tab)
│   ├── Day-by-day plan view
│   └── Exercise Library (searchable/filterable)
│       └── Exercise Detail       (pushed)
│
├── Progress                      (tab)
│   ├── Overview (volume, frequency check)
│   ├── PR Wall
│   ├── Per-exercise charts
│   ├── Period comparison
│   ├── RPE/fatigue trend
│   ├── Plateau flags
│   └── Badges
│
├── History                       (tab)
│   ├── Calendar/streak heatmap
│   ├── Session list (search/filter)
│   └── Session Detail            (pushed, editable)
│
├── Settings                      (tab)
│   ├── Preferences (units, theme, rest timer, voice)
│   ├── Cycle start date
│   ├── Pause mode
│   ├── Data (export/import/reset)
│   └── Apple Health (Phase 2 placeholder)
│
└── Active Workout Session         (full-screen modal flow, not a tab)
    └── Exercise Detail (in-context, same component as Program's)
```

---

## 3. Navigation pattern

| Breakpoint | Pattern |
|---|---|
| Mobile (< 768px) | Fixed bottom tab bar, 5 icons + labels. Drill-downs push in from the right with a back chevron top-left. Active Session opens as a full-screen cover (slide up), with an explicit "End" / back control — never dismissible by accident. |
| Desktop (≥ 768px) | Left sidebar (same 5 destinations, icon + label, always expanded — no hamburger). Content area uses the freed width for side-by-side layouts (e.g., exercise list + detail pane) rather than just stretching mobile layouts wider. |

Transitions: 150–200ms ease-out slide/fade between tabs; push/pop drill-downs slide horizontally; the Active Session cover slides up from the bottom and dims the background before it — signals "you're in a focused mode now."

---

## 4. Color system

### 4.1 Base themes

**Dark (default)** — primary aesthetic; gym-appropriate, premium feel, easy on the eyes under harsh gym lighting.

| Token | Hex | Use |
|---|---|---|
| `bg.base` | `#0B1120` | App background |
| `bg.surface` | `#131B2E` | Cards, sheets |
| `bg.surfaceRaised` | `#1B2540` | Modals, active/selected cards |
| `border.subtle` | `#26314D` | Card borders, dividers |
| `text.primary` | `#F1F5F9` | Headlines, primary values |
| `text.secondary` | `#94A3B8` | Labels, captions |
| `text.muted` | `#5B6B8C` | Disabled, placeholder |

**Light (toggle)** — mirrors the source program document's palette for continuity.

| Token | Hex | Use |
|---|---|---|
| `bg.base` | `#F8FAFC` | App background |
| `bg.surface` | `#FFFFFF` | Cards, sheets |
| `border.subtle` | `#E2E8F0` | Card borders, dividers |
| `text.primary` | `#0F172A` | Headlines, primary values |
| `text.secondary` | `#475569` | Labels, captions |

### 4.2 Day-accent colors (carried directly from the program document, unchanged for continuity)

| Day | Hex | Used for |
|---|---|---|
| Push | `#1F4E5F` | Push day banner, badges, charts filtered to Push |
| Pull | `#6D28D9` | Pull day banner, badges, charts |
| Legs | `#0F766E` | Legs day banner, badges, charts |
| Upper | `#B45309` | Upper day banner, badges, charts |
| Lower | `#BE123C` | Lower day banner, badges, charts |
| Rest | `#64748B` | Rest day banner, calendar rest markers |

### 4.3 Semantic colors (same hue logic as the program document's callout cards)

| Meaning | Hex (bg / text, dark theme) | Hex (bg / text, light theme) | Used for |
|---|---|---|---|
| Success / cues | `#0B2E24` / `#34D399` | `#ECFDF5` / `#065F46` | Form cues, completed states, PR highlight |
| Warning / caution | `#3A2A0B` / `#FBBF24` | `#FFFBEB` / `#B45309` | Deload nudge, form-refresher nudge, notes |
| Danger / mistakes | `#3A0E14` / `#FB7185` | `#FEF2F2` / `#B91C1C` | Common mistakes, delete confirmation |
| Info / alternatives | `#0B2036` / `#60A5FA` | `#EFF6FF` / `#1D4ED8` | Alternative exercise, equipment swap |
| Accent / primary action | `#14B8A6` | `#0F766E` | Primary buttons (Start Workout, Log Set), active tab indicator |

**Rule:** exactly one accent color (`#14B8A6` teal, dark theme) is used for primary actions app-wide, so it stays meaningful; day-colors are never used for buttons, only for identity (banners, badges, chart series).

---

## 5. Typography

- **Font stack:** system UI stack — `-apple-system, "SF Pro Text", Inter, "Segoe UI", Roboto, sans-serif` — no webfont loading dependency.
- **Numerals:** tabular/monospaced figures for all logged weights/reps so columns of numbers align (`font-variant-numeric: tabular-nums`).

| Style | Size | Weight | Use |
|---|---|---|---|
| Display | 32px | 700 | Page titles ("Home", "Progress") |
| H1 | 24px | 700 | Section headers, day banner titles |
| H2 | 18px | 600 | Card titles, exercise names |
| Body | 15px | 400 | Standard text |
| Body Bold | 15px | 600 | Emphasized values |
| Caption | 13px | 500 | Labels, metadata, timestamps |
| Numeral Large | 28px | 700 (tabular) | Weight/rep entry displays, timers |
| Numeral Small | 17px | 600 (tabular) | Inline logged values in lists |

---

## 6. Spacing & layout

- Base unit: **4px**. Standard paddings: 8 / 12 / 16 / 24px.
- Cards: 16px internal padding, 12px corner radius (dark theme uses a 1px `border.subtle` instead of shadow; light theme uses a soft shadow `0 1px 3px rgba(15,23,42,0.08)` matching the docx card style).
- Screen horizontal margin: 16px mobile, 24px desktop content area.
- Bottom tab bar height: 56px + safe-area inset.

---

## 7. Core UI components

| Component | Notes |
|---|---|
| **Day banner** | Full-width colored bar, day name + subtitle, same treatment as the source docx's colored banners |
| **Stat table** | Exercise/sets/reps/weight rows — zebra striping in light theme, subtle row dividers in dark |
| **Muscle-map diagram** | Simple front/back body outline on Exercise Detail, target muscle(s) filled in the exercise's day-accent color — quick visual complement to the text description, not a replacement for it |
| **Callout card** | Colored background + left accent bar + label + bullet list — direct carryover from the docx's cue/mistake/alternative cards |
| **Set logger row** | Prescribed value (muted) next to an editable actual value; steppers (±) for quick adjustment, tap-to-type for precise entry; checkmark to confirm |
| **Rest timer** | Large circular countdown, color shifts from accent to warning tone in the last 10 seconds, big "+15s / Skip" controls |
| **Recovery countdown chip** | Small pill per muscle group: name + "Xd ago," color intensity fades as recovery time passes |
| **PR badge** | Small trophy icon + weight, animates in (scale + fade) the moment a set beats history |
| **Progress ring** | Session completion (exercises done / total) shown as a ring in the Active Session header |
| **Streak heatmap cell** | Calendar-day squares: filled with day-accent color when completed, hollow outline with a rest icon when a rest day, **solid danger-tone (`#BE123C`/`#FB7185`) with a small "Missed: [Day]" label on tap** for a training day that passed uncompleted, **a calm teal (`#14B8A6`/`#0B2E24`) with a small leaf/heart icon for "Active Recovery"** (soreness-triggered cardio swap — deliberately not the danger color, since this is a good choice, not a lapse), plain neutral/empty for blank in-between days during a gap |
| **Sore-day prompt** | Secondary text-button on Home ("Feeling sore from yesterday?"), low visual weight — never competes with the primary "Start Workout" CTA. Tapping opens a bottom sheet in the Recovery teal tone with the trainer framing copy, a primary "Log cardio instead" action, and a plain "Never mind, I'll lift" dismiss |
| **Update-available banner** | Thin, dismissible-but-persistent-until-actioned banner at the top of any screen when a new deployed version is detected — "Update available · Refresh" — never a forced silent reload mid-session |
| **Error boundary screen** | Full-screen, calm (not alarming red) state: short apology, "your data is safe" reassurance, single "Reload" button — replaces a blank crash screen anywhere in the app |
| **Leave-session confirm** | Small centered dialog on back-navigation during an active session — "Leave this workout? Your progress is saved." with Leave / Stay actions — never a silent exit |
| **Wake-lock indicator** | Small, subtle icon in the Active Session header when the screen-stay-on lock is active, tappable to toggle off without going to Settings mid-workout |
| **Pending-day banner** | Thin banner on Home, day-accent colored left bar, shown only when the cycle pointer is behind the calendar (i.e., after a miss): "Picking up your missed [Day]" — dismissible but reappears each session until that day is logged |
| **Long-gap prompt** | Modal/bottom-sheet shown once when reopening the app after 5+ days idle: two large tappable options ("Continue [Pending Day]" vs. "Start fresh today"), no default pre-selected — this is a real decision, not a dismiss-and-move-on |
| **Save-failed toast** | Persistent (not auto-dismissing) danger-tone toast with a "Retry" button — shown any time a set or session fails to persist; never disappears on its own since the data isn't safe until it succeeds |
| **Import error state** | Full-message inline card on the Settings import screen — explains what was wrong in plain language, confirms existing data was left untouched, offers to try a different file |
| **Unusual-value confirm** | Inline warning row under the input (not a blocking modal) — "That's well outside your usual range for this exercise — tap again to confirm" — keeps logging fast for the 99% case while still catching fat-finger errors |
| **Deload/pause badge** | Small tag on the day banner and any charts covering that window — "Deload" or "Paused" in muted warning-tone — so lighter numbers in that stretch never read as a visual regression at a glance |
| **Chart empty state** | Any chart (strength, RPE trend, volume) with insufficient data shows a centered icon + "Not enough data yet — log a few more sessions" instead of an empty axis or a broken line |
| **History "load more"** | Session list and per-exercise history default to a recent window (last ~90 days / 20 sessions) with a clear "Load earlier history" action at the bottom, keeping long-term use fast |
| **Toast (undo)** | Bottom-anchored, 5-second auto-dismiss, "Undo" action, used for deletes |
| **Bottom sheet** | Used for quick actions (equipment-busy swap, session notes) so the user never fully leaves the session screen |
| **Empty state** | Icon + one-line message + a single relevant action (e.g., History with no sessions yet: "No workouts logged — start today's session from Home") |

---

## 8. Iconography

`lucide-react`, consistent 20–24px, stroke-based (not filled) to match the line-art pictogram style already established in the program document.

| Concept | Icon |
|---|---|
| Home | `home` |
| Program/Library | `list-checks` or `dumbbell` |
| Progress | `trending-up` |
| History | `calendar` |
| Settings | `settings` |
| Start workout | `play` |
| Rest timer | `timer` |
| PR | `trophy` |
| Alternative swap | `repeat` |
| Voice mode | `volume-2` |
| Export/backup | `download` |
| Warning/nudge | `alert-triangle` |

---

## 9. Motion & microinteractions

- **PR moment:** brief full-width banner slide-down in the day's accent + gold trophy icon, auto-dismisses in ~3s, also logged permanently to the PR Wall — the one place the UI is deliberately a little louder.
- **Rest timer end:** circular ring completes, gentle pulse (scale 1 → 1.04 → 1) on the timer, plus the voice-mode announcement if enabled.
- **Set logged:** row checkmark animates in, row background briefly flashes success-tint then settles.
- **Tab switches / drill-downs:** standard slide/fade, 150–200ms, no bounce — keep it fast, this is a utility app.
- **Streak heatmap fill:** on first load of History, cells fade/stagger in briefly (~400ms total) — the one "showcase" animation, since this screen is meant to feel rewarding to look at.

---

## 10. Accessibility

- Minimum 44×44px tap targets throughout (critical for gym use with sweaty/gloved hands).
- Color is never the only signal — day banners and semantic cards also carry text labels; PR/streak states pair color with icon and text. Specifically for the day-accent palette: Push's dark teal and Legs' teal-green sit close enough in hue to be hard to tell apart for some forms of color blindness, so each day also gets its own **distinct icon** (not just its color) wherever it appears — banners, badges, calendar cells — so identity never depends on hue discrimination alone.
- Text scales with system/browser zoom without breaking layout (no fixed-height text containers).
- Contrast ratios meet WCAG AA minimum in both themes (verified against the token table above).

---

## 11. Responsive behavior summary

| Element | Mobile | Desktop |
|---|---|---|
| Navigation | Bottom tab bar | Left sidebar |
| Program library | Single-column list → detail push | Two-pane: list left, detail right |
| Active session | Full-screen, one exercise emphasized at a time, scroll for others | Full-screen, slightly wider with session summary sidebar visible |
| Progress charts | Stacked, full-width, swipe between chart types | Grid layout, 2 charts per row |

---

**Next step:** build the app against this spec and the Master Prompt.
