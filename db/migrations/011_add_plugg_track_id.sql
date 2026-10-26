-- ============================================================================
-- Migration 011: Add Plugg Track ID (PLG-YYYY-XXXXXX)
-- ============================================================================
-- Adds an automatic, permanent, unique Plugg Track ID to every track.
-- Format: PLG-YYYY-XXXXXX (e.g. PLG-2026-000001)
-- Uses a PostgreSQL sequence for gap-free, concurrency-safe numbering.
-- ============================================================================

BEGIN;

-- 1. Create the sequence used for the six-digit portion
CREATE SEQUENCE IF NOT EXISTS plugg_track_id_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  NO CYCLE;

-- 2. Add the column (nullable first so we can backfill existing rows)
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS plugg_track_id TEXT;

-- 3. Backfill existing tracks with IDs based on their creation order
--    Uses a CTE to assign sequence values in created_at order
WITH ordered AS (
  SELECT id,
         nextval('plugg_track_id_seq') AS seq_num,
         EXTRACT(YEAR FROM created_at)::INT AS yr
  FROM tracks
  ORDER BY created_at ASC
)
UPDATE tracks t
SET plugg_track_id = 'PLG-' || o.yr || '-' || LPAD(o.seq_num::TEXT, 6, '0')
FROM ordered o
WHERE t.id = o.id
  AND t.plugg_track_id IS NULL;

-- 4. Make the column NOT NULL and add a unique constraint
ALTER TABLE tracks
  ALTER COLUMN plugg_track_id SET NOT NULL;

ALTER TABLE tracks
  ADD CONSTRAINT uq_tracks_plugg_track_id UNIQUE (plugg_track_id);

-- 5. Add an index for fast lookups by Plugg Track ID
CREATE INDEX IF NOT EXISTS idx_tracks_plugg_track_id ON tracks(plugg_track_id);

COMMIT;
