-- Add optional race website URL to games table.
-- This is a general link to the race event page (for runners to sign up or
-- get info), distinct from official_results_url which is for post-race results.

alter table games
  add column race_website_url text;
