-- Add optional city/state location to games table (e.g. "Pittsburgh, PA")
alter table games
  add column location text;
