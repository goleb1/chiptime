-- ============================================================
-- ChipTime — Enable Row Level Security
-- All app queries use the service role key (bypasses RLS),
-- so no explicit policies are needed. This simply blocks
-- direct anon key access to the database.
-- ============================================================

alter table games       enable row level security;
alter table runners     enable row level security;
alter table athletes    enable row level security;
alter table guessers    enable row level security;
alter table predictions enable row level security;
alter table awards      enable row level security;

-- Fix: Function Search Path Mutable warning
-- Pins search_path so the function can't be exploited via schema injection.
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = public;
