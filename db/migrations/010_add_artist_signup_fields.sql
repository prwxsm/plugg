-- Migration 010: Add artist country, city, primary_genre, additional_genres, and terms_accepted_at
ALTER TABLE artists
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS primary_genre TEXT,
ADD COLUMN IF NOT EXISTS additional_genres TEXT[],
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
