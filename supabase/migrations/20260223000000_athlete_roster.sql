-- ============================================================
-- ChipTime — Athlete Roster
-- Adds a persistent athletes table and links runners to it.
-- ============================================================

-- -----------------------------------------------------------
-- Athletes
-- -----------------------------------------------------------
create table athletes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  strava_url text,
  photo_url text,
  -- PRs stored as JSONB: { "5K": 1234, "Half Marathon": 5678, ... } (values in seconds)
  prs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_athletes_updated_at
  before update on athletes
  for each row execute function update_updated_at_column();

-- -----------------------------------------------------------
-- Link runners → athletes (nullable; existing rows unaffected)
-- -----------------------------------------------------------
alter table runners
  add column athlete_id uuid references athletes (id) on delete set null;

create index idx_runners_athlete_id on runners (athlete_id);
