-- 005_add_phone_number_to_artists.sql
-- Add phone_number column to artists table for private contact information

ALTER TABLE artists ADD COLUMN IF NOT EXISTS phone_number TEXT NOT NULL DEFAULT '';
