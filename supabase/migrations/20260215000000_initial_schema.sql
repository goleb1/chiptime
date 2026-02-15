-- ============================================================
-- ChipTime — Initial Database Schema
-- Source of truth: chiptime_mvp_prd.md Section 4.2
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------
-- Games
-- -----------------------------------------------------------
create table games (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  race_date date not null,
  race_start_time timestamptz not null,
  distances text[] not null default '{}',
  official_results_url text,
  prediction_deadline timestamptz not null,
  status text not null default 'setup'
    check (status in ('setup', 'predictions_open', 'predictions_locked', 'results_entering', 'finalized')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_games_slug on games (slug);

-- -----------------------------------------------------------
-- Runners
-- -----------------------------------------------------------
create table runners (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid not null references games (id) on delete cascade,
  name text not null,
  distance text not null,
  notes text,
  actual_time_seconds integer,
  status text not null default 'registered'
    check (status in ('registered', 'finished', 'dnf', 'dns')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_runners_game_id on runners (game_id);

-- -----------------------------------------------------------
-- Guessers
-- -----------------------------------------------------------
create table guessers (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid not null references games (id) on delete cascade,
  name text not null,
  submitted_at timestamptz,
  total_score integer,
  rank integer,
  created_at timestamptz not null default now()
);

create index idx_guessers_game_id on guessers (game_id);

-- -----------------------------------------------------------
-- Predictions
-- -----------------------------------------------------------
create table predictions (
  id uuid primary key default uuid_generate_v4(),
  guesser_id uuid not null references guessers (id) on delete cascade,
  runner_id uuid not null references runners (id) on delete cascade,
  predicted_time_seconds integer not null,
  dnf_badge boolean not null default false,
  score integer,
  error_percentage numeric(6,4),
  tier_label text,
  created_at timestamptz not null default now(),

  constraint uq_prediction_guesser_runner unique (guesser_id, runner_id)
);

create index idx_predictions_guesser_id on predictions (guesser_id);
create index idx_predictions_runner_id on predictions (runner_id);

-- -----------------------------------------------------------
-- Awards
-- -----------------------------------------------------------
create table awards (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid not null references games (id) on delete cascade,
  guesser_id uuid not null references guessers (id) on delete cascade,
  award_type text not null
    check (award_type in ('sniper', 'trash_can', 'robot', 'chaos_agent', 'oracle')),
  detail text,
  created_at timestamptz not null default now()
);

create index idx_awards_game_id on awards (game_id);

-- -----------------------------------------------------------
-- Auto-update updated_at on games
-- -----------------------------------------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_games_updated_at
  before update on games
  for each row
  execute function update_updated_at_column();
