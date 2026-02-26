-- Add show_on_homepage flag to games table.
-- Defaults to false so existing and new games are hidden from the homepage
-- until an admin explicitly enables visibility.

ALTER TABLE games ADD COLUMN show_on_homepage boolean NOT NULL DEFAULT false;
