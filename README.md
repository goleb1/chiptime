# ChipTime

**Predict race times. Compete with friends. Earn awards.**

ChipTime is a race time prediction game. An admin sets up a race weekend, adds runners, and shares a link. Guessers predict each runner's finish time before the deadline. As results come in, a live leaderboard ranks everyone by accuracy — and side awards celebrate the best (and worst) predictions.

## How It Works

1. **Admin creates a game** for a race weekend, adds runners and their distances, and sets a prediction deadline.
2. **Guessers submit predictions** — a finish time for every runner, plus optional DNF Risk badges on up to 2 runners.
3. **Race day** — as actual results are entered, the leaderboard updates live with scores and rankings.
4. **Awards are revealed** — Sniper (most accurate single pick), Trash Can (least accurate), The Robot (most consistent), Chaos Agent (wildest variance), and Oracle (correctly called a DNF).

## Scoring

Predictions are scored by **percentage error**, which normalizes across distances — being 4 minutes off on a marathon is roughly equivalent to 25 seconds off on a 5K.

| Accuracy       | Points |
|----------------|--------|
| Dead on (0%)   | 100    |
| Within 0.5%    | 90     |
| Within 1%      | 80     |
| Within 2%      | 65     |
| Within 3%      | 50     |
| Within 5%      | 35     |
| Within 8%      | 20     |
| Within 12%     | 10     |
| Beyond 12%     | 5      |

Total score = sum of points across all runner predictions. Tiebreaker: best single prediction (lowest error %).

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (Postgres)
- **Hosting:** Vercel
- **Domain:** [chiptime.app](https://chiptime.app)

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

### Setup

```bash
git clone <repo-url>
cd chiptime
npm install
```

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_SECRET=your-admin-secret
```

Run the database migration against your Supabase project (via the Supabase dashboard SQL editor or CLI):

```
supabase/migrations/20260215000000_initial_schema.sql
```

### Development

```bash
npm run dev       # Start dev server at http://localhost:3000
npm test          # Run tests
npm run lint      # Lint
npm run build     # Production build
```

### Key URLs (local dev)

| URL | Purpose |
|-----|---------|
| `localhost:3000` | Landing page |
| `localhost:3000/admin/{ADMIN_SECRET}` | Admin dashboard |
| `localhost:3000/game/{slug}` | Guesser game page |
| `localhost:3000/results/{slug}` | Public results page |

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── admin/[secret]/         # Admin pages (secret-gated)
│   ├── game/[slug]/            # Guesser prediction & leaderboard
│   ├── results/[slug]/         # Public read-only results
│   └── api/games/[slug]/       # API routes
├── lib/
│   ├── types.ts                # All TypeScript interfaces
│   ├── constants.ts            # Scoring tiers, distances, config
│   ├── scoring.ts              # Scoring engine
│   ├── awards.ts               # Award computation
│   ├── utils.ts                # Time conversion helpers
│   ├── supabase.ts             # Supabase client setup
│   └── __tests__/              # Unit tests
supabase/
└── migrations/                 # SQL migration files
```

## Deployment

Push to `main` — Vercel auto-deploys. See [DEPLOY.md](DEPLOY.md) for Vercel setup, custom domain configuration, and environment variable details.

## License

Private project. All rights reserved.
