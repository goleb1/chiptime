# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChipTime is a race time prediction game where guessers predict finish times for runners in a race weekend, scored by percentage-based accuracy. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, and Supabase (Postgres). Deployed on Vercel at chiptime.app.

Target launch: Pittsburgh Marathon, May 3, 2026.

## Commands

- `npm run dev` — start Next.js dev server
- `npm run build` — production build
- `npm run lint` — ESLint (flat config, Next.js core-web-vitals + TypeScript)
- `npm test` — run all Jest tests
- `npm run test:watch` — run tests in watch mode
- `npx jest src/lib/__tests__/scoring.test.ts` — run a single test file

## Architecture

### Core Business Logic (`src/lib/`)

All game logic is isolated from UI code and independently testable:

- **`types.ts`** — Single source of truth for all TypeScript interfaces. Data model mirrors the Supabase schema with camelCase naming. Key types: `Game`, `Runner`, `Guesser`, `Prediction`, `Award`, `PredictionScore`, `GuesserScore`.
- **`constants.ts`** — Configurable scoring tiers, distance defaults, DNF point values, polling intervals. Scoring tiers are data-driven (array walked by the scoring engine), not hardcoded conditionals.
- **`scoring.ts`** — Scoring engine. `scorePrediction()` computes error % and maps to tier. `scoreDnf()` handles DNF/DNS. `scoreGuesser()` scores all predictions for a guesser against runner results.
- **`awards.ts`** — `computeAwards()` determines all 5 side awards (Sniper, Trash Can, Robot, Chaos Agent, Oracle) from scored predictions.
- **`utils.ts`** — Time conversion between seconds (storage format) and display strings. All times stored as integer seconds in the DB.
- **`supabase.ts`** — Two clients: `supabase` (anon key, client-safe) and `createAdminClient()` (service role key, server-only).

### App Router Pages (`src/app/`)

- `/admin/[secret]/` — Admin dashboard, gated by secret URL segment
- `/admin/[secret]/create/` — Create game form
- `/admin/[secret]/game/[slug]/` — Manage runners and enter results for a game
- `/game/[slug]/` — Guesser-facing: view runners, submit predictions, see leaderboard
- `/results/[slug]/` — Public read-only results/leaderboard

### API Routes (`src/app/api/`)

- `/api/games/[slug]` — GET game details
- `/api/games/[slug]/leaderboard` — GET scored leaderboard

### Database (`supabase/migrations/`)

Five tables: `games`, `runners`, `guessers`, `predictions`, `awards`. Schema uses snake_case; the TypeScript types use camelCase. The `games` table has an auto-updating `updated_at` trigger.

Game status state machine: `setup` → `predictions_open` → `predictions_locked` → `results_entering` → `finalized`

## Key Conventions

- **Path alias:** `@/*` maps to `src/*` (configured in tsconfig and jest)
- **Time storage:** All times as total seconds (integers). `3:24:00` = `12240`. Conversion in `utils.ts`.
- **Scoring formula:** `|predicted - actual| / actual * 100` gives error %, matched against tier thresholds in `constants.ts`
- **DNF scoring:** Badge + DNF = 50 pts ("DNF Called"). No badge + DNF = 0 pts ("DNF Missed"). Guesser gets max 2 DNF badges.
- **No authentication** — admin access via secret URL, guesser identity via free-text name entry
- **Tests use ts-jest** with node test environment

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY    # server-side only
ADMIN_SECRET                 # secret path for admin access
```

## Spec Documents

- `chiptime_game_spec.md` — Game design spec (scoring rules, awards, DNF handling)
- `chiptime_mvp_prd.md` — MVP PRD (data model, API routes, user flows, full feature spec)
- `chiptime_future_ideas.md` — Deferred feature ideas
