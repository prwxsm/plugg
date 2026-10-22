-- 006_add_download_count_to_tracks.sql
-- Add download_count column to tracks table
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS download_count BIGINT NOT NULL DEFAULT 0;
