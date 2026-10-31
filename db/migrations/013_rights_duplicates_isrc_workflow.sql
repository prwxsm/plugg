-- ============================================================================
-- Migration 013: Rights, Ownership Declarations, Duplicate Hashing, ISRCs & Complaints
-- ============================================================================

BEGIN;

-- 1. Add release-level rights declaration and rights hold columns
ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS uploader_role TEXT NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS rights_declaration_text TEXT,
  ADD COLUMN IF NOT EXISTS rights_declaration_version TEXT,
  ADD COLUMN IF NOT EXISTS rights_declaration_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rights_declared_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rights_hold BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rights_hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS rights_hold_placed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rights_hold_placed_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- 2. Add track-level recording classification, sample details, ISRC, and file hash
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS recording_type TEXT NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS has_samples_or_beats BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sample_details TEXT,
  ADD COLUMN IF NOT EXISTS isrc TEXT,
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- 3. Add file_hash to files table for deduplication
ALTER TABLE files
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- 4. Create sequence and table for administrative copyright complaints
CREATE SEQUENCE IF NOT EXISTS copyright_complaint_seq START WITH 1 INCREMENT BY 1 NO MAXVALUE NO CYCLE;

CREATE TABLE IF NOT EXISTS copyright_complaints (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  release_id TEXT REFERENCES releases(id) ON DELETE SET NULL,
  track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL,
  complainant_name TEXT NOT NULL,
  complainant_email TEXT NOT NULL,
  rights_holder_represented TEXT,
  work_claimed TEXT NOT NULL,
  nature_of_infringement TEXT NOT NULL,
  conflict_nature TEXT,
  evidence_notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('received', 'under_investigation', 'resolved', 'resolved_takedown', 'resolved_reinstated', 'dismissed')) DEFAULT 'received',
  admin_notes TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_releases_rights_hold ON releases(rights_hold);
CREATE INDEX IF NOT EXISTS idx_tracks_file_hash ON tracks(file_hash);
CREATE INDEX IF NOT EXISTS idx_tracks_isrc ON tracks(isrc) WHERE isrc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_file_hash ON files(file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_copyright_complaints_release ON copyright_complaints(release_id);
CREATE INDEX IF NOT EXISTS idx_copyright_complaints_status ON copyright_complaints(status);

COMMIT;
