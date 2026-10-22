-- 004_add_label_to_releases.sql
-- Add label column to releases table to support independent / signed music label attribution

ALTER TABLE releases ADD COLUMN IF NOT EXISTS label TEXT;
