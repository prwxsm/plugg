-- 007_add_like_count_to_tracks.sql
-- Add like_count column to tracks table
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS like_count BIGINT NOT NULL DEFAULT 0;

-- Populate existing tracks with realistic like counts proportional to play count
UPDATE tracks 
SET like_count = GREATEST(5, FLOOR(play_count * 0.065))
WHERE play_count > 0 AND like_count = 0;
