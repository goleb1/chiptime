# ChipTime MVP — Product Requirements Document

**chiptime.app**
**Version 1.0 — February 2026**
**Target Launch: Pittsburgh Marathon — May 3, 2026**

*This document supplements the ChipTime Game Design Specification (v1.0, February 2025) with implementation-specific decisions, user flows, data model, and technical requirements needed to build the MVP.*

---

## 1. MVP Summary

ChipTime is a race time prediction game where guessers predict finish times for runners competing in a race weekend. The MVP supports a single active game at a time, manual administration, link-based access with no authentication, and a live-updating leaderboard.

### 1.1 First Game Parameters

- **Race:** Pittsburgh Marathon 2026 (May 3, 2026)
- **Expected runners:** ~20 (across multiple distances)
- **Expected guessers:** ~5
- **Development approach:** Claude Code (AI-assisted), built for extensibility

### 1.2 Key Architecture Principles

Given that this will be built with Claude Code and iterated on over time:

- **Clean separation of concerns** — distinct layers for data, business logic, and UI
- **Type safety throughout** — TypeScript interfaces for all data structures, no `any` types
- **Modular scoring engine** — scoring logic isolated in its own module so tiers, formulas, and awards can be tuned without touching UI code
- **Database-first data model** — all game state lives in Supabase, not localStorage (localStorage used only for draft auto-save)
- **Component-based UI** — small, reusable React components that can be rearranged as the app evolves

---

## 2. User Roles & Access Model

### 2.1 Roles

| Role | How they access | What they can do |
|---|---|---|
| **Admin** | Secret admin URL (e.g., `chiptime.app/admin/{secret}`) | Create games, add runners, set deadlines, enter results, mark DNF/DNS |
| **Guesser** | Shared game link (e.g., `chiptime.app/game/{gameId}`) | View runners, submit predictions, view leaderboard |
| **Spectator** | Public results URL (e.g., `chiptime.app/results/{gameId}`) | View leaderboard and results (read-only) |

### 2.2 Access Details

- **No authentication.** No accounts, no passwords, no email verification.
- **Admin access** is gated by a secret URL or password — not a full auth system, just a simple gate. The admin secret should be configurable per deployment (environment variable).
- **Guesser access** is via a shareable game link. Anyone with the link can play.
- **Guesser identity** is free-text name entry at prediction submission. No duplicate prevention in v1 — admin can resolve manually if needed.
- **Predictions are hidden** from other guessers until the prediction deadline passes.

---

## 3. Screen-by-Screen User Flows

### 3.1 Admin Flow

```
ADMIN HOME (chiptime.app/admin/{secret})
├── Dashboard showing active game (if any) and past games
│
├── CREATE GAME
│   ├── Form fields:
│   │   ├── Race name (text) — e.g., "Pittsburgh Marathon 2026"
│   │   ├── Race date (date picker)
│   │   ├── Race start time (time picker)
│   │   ├── Distances offered (multi-select from: Mile, 5K, 10K, 10mi, Half Marathon, Full Marathon, 50K, 100K, 100mi)
│   │   ├── Official results URL (optional, text — link to race org results page)
│   │   ├── Prediction deadline (date + time picker)
│   │   └── Submit → generates shareable game link
│   │
│   └── Success: displays game link to copy/share
│
├── MANAGE RUNNERS (within active game)
│   ├── List of current runners (name, distance, optional notes/PR)
│   ├── ADD RUNNER form:
│   │   ├── Runner name (text)
│   │   ├── Distance (dropdown — filtered to distances enabled for this game)
│   │   ├── Notes / Recent PR (optional text — e.g., "Ran 3:18 at Philly 2025")
│   │   └── Submit → runner appears in list
│   ├── Edit runner (inline edit name, distance, notes)
│   └── Remove runner (with confirmation — only before predictions open)
│
├── ENTER RESULTS (race day / post-race)
│   ├── List of all runners
│   ├── Per runner:
│   │   ├── Finish time input (H:MM:SS format)
│   │   ├── Status toggle: Finished / DNF / DNS
│   │   └── Save per runner (individual save, not batch)
│   ├── Leaderboard auto-recalculates as each result is saved
│   └── "Finalize Results" button — locks the game and publishes final leaderboard
│
└── VIEW RESULTS
    ├── Same leaderboard view as guessers/spectators
    └── Link to public results URL for sharing
```

### 3.2 Guesser Flow

```
GAME PAGE (chiptime.app/game/{gameId})
│
├── BEFORE DEADLINE:
│   ├── Game header: Race name, date, start time, distances
│   ├── Countdown timer to prediction deadline
│   ├── Runner list grouped by distance (longest distance first):
│   │   └── Per runner: Name, Distance, Notes/PR (if admin provided)
│   │
│   ├── SUBMIT PREDICTIONS
│   │   ├── "Your Name" field (free text, required)
│   │   ├── Per runner (grouped by distance):
│   │   │   ├── Runner name + distance label
│   │   │   ├── Time input: scroll/drum picker (H : MM : SS)
│   │   │   │   └── Drum picker should have intelligent defaults:
│   │   │   │       ├── Marathon runners: default to ~3:30:00
│   │   │   │       ├── Half marathon: default to ~1:45:00
│   │   │   │       ├── 10K: default to ~50:00
│   │   │   │       ├── 5K: default to ~25:00
│   │   │   │       └── Other distances: reasonable midpoint
│   │   │   └── DNF Risk badge toggle (checkbox or toggle switch)
│   │   ├── DNF badge counter: "X of 2 DNF Risk badges used"
│   │   ├── Auto-save indicator: "Draft saved" / "Saving..."
│   │   └── "Submit Predictions" button (disabled until all runners have predictions)
│   │
│   ├── DRAFT STATE
│   │   ├── Drafts auto-saved to localStorage keyed by game ID + guesser name
│   │   ├── If guesser returns to same game from same device, draft is restored
│   │   ├── "You have a saved draft" banner on return visit
│   │   └── Draft is cleared after successful submission
│   │
│   └── CONFIRMATION
│       ├── "Predictions submitted!" success message
│       ├── Summary of all predictions (read-only)
│       └── "Predictions are locked — no changes allowed"
│
├── AFTER DEADLINE / DURING RACE:
│   ├── Predictions are locked (no new submissions or edits)
│   ├── LEADERBOARD (auto-refreshes every 30 seconds)
│   │   ├── Rank | Guesser Name | Total Score | Award Badges
│   │   ├── Expandable row per guesser showing:
│   │   │   └── Per runner: Prediction | Actual | Error % | Points | Tier label
│   │   ├── Runners with pending results show "⏳ Awaiting result"
│   │   └── Side award badges appear as icons next to guesser names
│   └── Runner results summary: which runners have finished, which are still racing
│
└── AFTER FINALIZATION:
    ├── Final leaderboard with all awards
    ├── Link to official race results (if admin provided URL)
    └── Public shareable URL for results
```

### 3.3 Spectator Flow

```
RESULTS PAGE (chiptime.app/results/{gameId})
│
├── Read-only view of final leaderboard
├── Same expandable detail as guesser view
├── Race metadata: name, date, distances, official results link
└── No prediction submission — view only
```

---

## 4. Data Model

### 4.1 Entity Relationship Overview

```
Game (1) ──── (many) Runner
Game (1) ──── (many) Guesser
Guesser (1) ──── (many) Prediction
Runner (1) ──── (many) Prediction
Prediction = junction of Guesser × Runner (with time guess + DNF badge + score)
```

### 4.2 Database Tables (Supabase / Postgres)

#### `games`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `slug` | text (unique) | URL-friendly identifier for game links |
| `name` | text | e.g., "Pittsburgh Marathon 2026" |
| `race_date` | date | Date of the race |
| `race_start_time` | timestamptz | Start time of the race |
| `distances` | text[] | Array of distances offered (e.g., `["5K", "Half Marathon", "Full Marathon"]`) |
| `official_results_url` | text (nullable) | Link to official race results page |
| `prediction_deadline` | timestamptz | When predictions lock |
| `status` | text | Enum: `setup`, `predictions_open`, `predictions_locked`, `results_entering`, `finalized` |
| `created_at` | timestamptz | Auto-generated |
| `updated_at` | timestamptz | Auto-updated |

#### `runners`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `game_id` | uuid (FK → games) | Which game this runner belongs to |
| `name` | text | Runner's display name |
| `distance` | text | e.g., "Full Marathon", "5K" |
| `notes` | text (nullable) | Optional context — recent PR, admin notes |
| `actual_time_seconds` | integer (nullable) | Actual finish time in total seconds (null until result entered) |
| `status` | text | Enum: `registered`, `finished`, `dnf`, `dns` |
| `sort_order` | integer | Controls display order within distance group |
| `created_at` | timestamptz | Auto-generated |

#### `guessers`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `game_id` | uuid (FK → games) | Which game this guesser is playing |
| `name` | text | Guesser's self-entered display name |
| `submitted_at` | timestamptz (nullable) | Null if draft, set when predictions submitted |
| `total_score` | integer (nullable) | Computed after results — cached for leaderboard performance |
| `rank` | integer (nullable) | Computed after results |
| `created_at` | timestamptz | Auto-generated |

#### `predictions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `guesser_id` | uuid (FK → guessers) | Who made this prediction |
| `runner_id` | uuid (FK → runners) | Who is being predicted |
| `predicted_time_seconds` | integer | Predicted finish time in total seconds |
| `dnf_badge` | boolean | Whether guesser assigned a DNF Risk badge to this runner |
| `score` | integer (nullable) | Points earned (null until scored) |
| `error_percentage` | numeric(6,4) (nullable) | Computed error % (null until scored) |
| `tier_label` | text (nullable) | e.g., "Dead on", "Within 2%", etc. |
| `created_at` | timestamptz | Auto-generated |

**Unique constraint:** `(guesser_id, runner_id)` — one prediction per guesser per runner.

#### `awards`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `game_id` | uuid (FK → games) | Which game |
| `guesser_id` | uuid (FK → guessers) | Award recipient |
| `award_type` | text | Enum: `sniper`, `trash_can`, `robot`, `chaos_agent`, `oracle` |
| `detail` | text (nullable) | e.g., "0.12% error on Carol's half marathon" |
| `created_at` | timestamptz | Auto-generated |

### 4.3 Key Indexes

- `runners.game_id` — fetch all runners for a game
- `guessers.game_id` — fetch all guessers for a game
- `predictions.guesser_id` — fetch all predictions for a guesser
- `predictions.runner_id` — fetch all predictions for a runner
- `games.slug` — URL lookups

### 4.4 Time Storage Convention

All times stored as **total seconds** (integer). Conversion handled in application layer:

- `3:24:00` → `12240` seconds
- `1:42:30` → `6150` seconds
- `22:15` → `1335` seconds

This simplifies math operations (percentage calculations, comparisons) and avoids time-format parsing bugs in the database.

---

## 5. Scoring Engine Specification

The scoring engine should be implemented as an **isolated module** (`lib/scoring.ts` or similar) that can be unit-tested independently.

### 5.1 Core Function

```typescript
// Input: predicted time (seconds), actual time (seconds)
// Output: { score: number, errorPercentage: number, tierLabel: string }

function scorePrediction(
  predictedTimeSeconds: number,
  actualTimeSeconds: number
): PredictionScore

// DNF/DNS handling
function scoreDnf(hasBadge: boolean): PredictionScore
// hasBadge true → 50 points, "DNF Called"
// hasBadge false → 0 points, "DNF Missed"
```

### 5.2 Scoring Tiers (from Game Design Spec)

| Error % | Points | Tier Label |
|---|---|---|
| 0% | 100 | Dead on |
| ≤ 0.5% | 90 | Within 0.5% |
| ≤ 1% | 80 | Within 1% |
| ≤ 2% | 65 | Within 2% |
| ≤ 3% | 50 | Within 3% |
| ≤ 5% | 35 | Within 5% |
| ≤ 8% | 20 | Within 8% |
| ≤ 12% | 10 | Within 12% |
| > 12% | 5 | Beyond 12% |

**These tiers should be defined as configuration, not hardcoded** — makes future tuning easy.

### 5.3 Award Computation

```typescript
function computeAwards(game: Game, guessers: Guesser[], predictions: Prediction[]): Award[]
```

| Award | Logic |
|---|---|
| 🎯 Sniper | Guesser with the single lowest `error_percentage` across all scored predictions. One winner. |
| 🗑️ Trash Can | Guesser with the single highest `error_percentage` across all scored predictions. One winner. |
| 🤖 The Robot | Guesser with the lowest standard deviation of `error_percentage` across their predictions. One winner. |
| 🎢 Chaos Agent | Guesser with the highest standard deviation of `error_percentage` across their predictions. One winner. |
| 🔮 Oracle | Any guesser who assigned a DNF Risk badge to a runner who actually DNF'd/DNS'd. Multiple winners possible. |

### 5.4 Tiebreaker

If total scores are tied, rank by best single prediction (lowest `error_percentage`). If still tied: co-champions.

---

## 6. Technical Requirements

### 6.1 Stack

| Layer | Technology |
|---|---|
| **Framework** | React + TypeScript (Next.js recommended for SSR + API routes) |
| **Styling** | Tailwind CSS |
| **Database** | Supabase (Postgres) |
| **Hosting** | Vercel |
| **Domain** | chiptime.app (owned, registered via Porkbun) |

### 6.2 Project Structure (Recommended)

```
chiptime/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx            # Landing / home
│   │   ├── game/[slug]/        # Guesser-facing game page
│   │   ├── results/[slug]/     # Public results page
│   │   └── admin/[secret]/     # Admin dashboard
│   ├── components/
│   │   ├── ui/                 # Generic UI components (Button, Card, Modal, etc.)
│   │   ├── game/               # Game-specific components (RunnerCard, TimePicker, etc.)
│   │   ├── leaderboard/        # Leaderboard components
│   │   └── admin/              # Admin-specific components
│   ├── lib/
│   │   ├── scoring.ts          # Scoring engine (isolated, unit-testable)
│   │   ├── awards.ts           # Award computation logic
│   │   ├── supabase.ts         # Supabase client setup
│   │   ├── types.ts            # TypeScript interfaces for all data structures
│   │   ├── utils.ts            # Time conversion, formatting helpers
│   │   └── constants.ts        # Scoring tiers, distance defaults, etc.
│   └── hooks/                  # Custom React hooks (useGame, useLeaderboard, etc.)
├── supabase/
│   └── migrations/             # Database migration files
├── public/
├── .env.local                  # Supabase keys, admin secret
└── package.json
```

### 6.3 Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # Server-side only, for admin operations
ADMIN_SECRET=...                      # Secret path segment for admin access
```

### 6.4 API Routes (Next.js API Routes or Server Actions)

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/games` | POST | Admin | Create a new game |
| `/api/games/[slug]` | GET | Public | Fetch game details + runners |
| `/api/games/[slug]/runners` | POST | Admin | Add a runner |
| `/api/games/[slug]/runners/[id]` | PUT/DELETE | Admin | Edit/remove a runner |
| `/api/games/[slug]/predictions` | POST | Public | Submit predictions (validates deadline) |
| `/api/games/[slug]/results` | POST | Admin | Enter a runner's result |
| `/api/games/[slug]/leaderboard` | GET | Public | Fetch leaderboard (scored) |
| `/api/games/[slug]/finalize` | POST | Admin | Lock final results + compute awards |

### 6.5 Leaderboard Polling

- Guesser/spectator pages poll `GET /api/games/[slug]/leaderboard` every **30 seconds**
- Polling activates only when game status is `results_entering`
- Polling stops when game status is `finalized`

### 6.6 Draft Auto-Save

- Drafts saved to **localStorage** keyed by `chiptime_draft_{gameSlug}_{guesserName}`
- Auto-save triggers on every input change (debounced 2 seconds)
- Draft includes: guesser name, all prediction times, DNF badge assignments
- Draft is cleared on successful submission
- On page load, check for existing draft and offer to restore

### 6.7 Time Input — Drum Picker Specification

The time picker is the most-used interactive element in the app. It must be excellent on mobile.

- **Three wheels:** Hours (0–23), Minutes (00–59), Seconds (00–59)
- **Scroll behavior:** Smooth momentum scroll with snap-to-value
- **Intelligent defaults by distance:**

| Distance | Default Time | Picker starts at |
|---|---|---|
| Mile | 0:06:00 | H=0, M=06, S=00 |
| 5K | 0:25:00 | H=0, M=25, S=00 |
| 10K | 0:50:00 | H=0, M=50, S=00 |
| 10mi | 1:20:00 | H=1, M=20, S=00 |
| Half Marathon | 1:45:00 | H=1, M=45, S=00 |
| Full Marathon | 3:30:00 | H=3, M=30, S=00 |
| 50K | 5:00:00 | H=5, M=00, S=00 |
| 100K | 12:00:00 | H=12, M=00, S=00 |
| 100mi | 24:00:00 | H=24, M=00, S=00 |

- **Visual design:** Large touch targets, clear selected value, distance label visible above picker
- **Haptic feedback:** If browser supports it (nice to have)

### 6.8 Responsive Design

- **Mobile-first** — designed for phones, scales up to desktop
- **Breakpoints:** Mobile (< 640px), Tablet (640–1024px), Desktop (> 1024px)
- **Critical mobile screens:** Prediction submission (drum picker must be comfortable to use one-handed), leaderboard (must be readable without horizontal scroll)

---

## 7. Game Status State Machine

```
setup → predictions_open → predictions_locked → results_entering → finalized
```

| Status | Trigger | What's allowed |
|---|---|---|
| `setup` | Game created | Admin can add/edit/remove runners. No predictions yet. |
| `predictions_open` | Admin opens game | Guessers can submit predictions. Admin can still add runners. |
| `predictions_locked` | Deadline passes (auto) or admin manually locks | No new predictions. Admin can enter results. |
| `results_entering` | First result entered | Leaderboard becomes visible. Scores computed per result. |
| `finalized` | Admin clicks "Finalize" | Awards computed. Leaderboard locked. Public results URL active. |

**Auto-lock:** The app should automatically transition from `predictions_open` to `predictions_locked` when the deadline passes. This can be checked client-side (hide the form) and enforced server-side (reject late submissions).

---

## 8. Design Direction

### 8.1 Visual Identity

- **Vibe:** Clean & sporty — Strava meets a prediction market
- **Primary emoji/icon:** ⏱️ (stopwatch) — used as favicon and brand mark
- **Tone:** Professional but playful. Confident, not corporate. The leaderboard should feel exciting, not like a spreadsheet.

### 8.2 Brand Identity (To Be Developed)

The following need to be created as part of the project:

- Color palette (primary, secondary, accent, success/error states)
- Typography selections (display font for headers, body font for content)
- Logo / wordmark for "ChipTime"
- Favicon (⏱️ themed)
- Award badge visual designs (🎯🗑️🤖🎢🔮)

### 8.3 Design Principles

- **Data-dense, not cluttered** — the leaderboard should show a lot of information clearly
- **Celebration moments** — when scores update, when awards are revealed, make it feel like something happened
- **Distance at a glance** — color-code or visually differentiate distance groups so a guesser can quickly orient themselves
- **Mobile-native interactions** — the drum picker, expandable rows, and swipe gestures should feel like a native app

---

## 9. Race Metadata (Added per Q19 feedback)

Each game captures and displays the following race details:

- Race name
- Race date
- Race start time
- Distances offered
- Official results URL (optional — shown post-race as a link to the race org's results page)
- Prediction deadline

This information is displayed in the game header on all views (guesser, spectator, admin).

---

## 10. Edge Cases (from Game Design Spec, implementation notes)

| Scenario | Handling |
|---|---|
| Runner changes distance after lock | Admin marks runner as voided. All predictions for that runner score 0. |
| Runner added after predictions open | Existing submitted predictions are not affected. New guessers must predict the new runner. |
| Race cancelled | Admin sets game status to a `cancelled` state (add to status enum). No scores. |
| Late submission attempt | Server rejects with clear error. Client hides form after deadline. |
| Duplicate guesser name | Allowed in v1. Admin resolves manually if needed. |
| Browser/device switch mid-draft | Draft is lost (localStorage is device-specific). Acceptable for MVP. |
| Admin enters wrong result | Admin can edit results before finalization. Scores recompute. |

---

## 11. Development Milestones

Suggested build order optimized for Claude Code development:

### Phase 1: Foundation
- [ ] Next.js project setup with TypeScript + Tailwind
- [ ] Supabase project + database schema (run migrations)
- [ ] Type definitions (`lib/types.ts`)
- [ ] Supabase client setup
- [ ] Scoring engine with unit tests (`lib/scoring.ts`)
- [ ] Award computation with unit tests (`lib/awards.ts`)

### Phase 2: Admin
- [ ] Admin dashboard page (secret URL gated)
- [ ] Create game form
- [ ] Add/edit/remove runners
- [ ] Enter results form
- [ ] Finalize game

### Phase 3: Guesser Experience
- [ ] Game page with runner list
- [ ] Drum picker time input component
- [ ] Prediction submission form with DNF badges
- [ ] Draft auto-save (localStorage)
- [ ] Submission confirmation

### Phase 4: Leaderboard
- [ ] Leaderboard display with rankings + scores
- [ ] Expandable prediction detail per guesser
- [ ] Award badge display
- [ ] Auto-polling (30 second interval)
- [ ] Public results page

### Phase 5: Polish & Launch
- [ ] Brand identity (colors, typography, logo)
- [ ] Responsive design pass (mobile-first)
- [ ] Domain setup (chiptime.app → Vercel)
- [ ] Error handling + loading states
- [ ] Testing with real data
