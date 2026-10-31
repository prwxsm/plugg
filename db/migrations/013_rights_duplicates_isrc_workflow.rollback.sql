-- ============================================================================
-- Migration 013 Rollback: Rights, Ownership Declarations, Duplicate Hashing, ISRCs & Complaints
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS copyright_complaints CASCADE;
DROP SEQUENCE IF EXISTS copyright_complaint_seq CASCADE;

ALTER TABLE files DROP COLUMN IF EXISTS file_hash;

ALTER TABLE tracks
  DROP COLUMN IF EXISTS recording_type,
  DROP COLUMN IF EXISTS has_samples_or_beats,
  DROP COLUMN IF EXISTS sample_details,
  DROP COLUMN IF EXISTS isrc,
  DROP COLUMN IF EXISTS file_hash;

ALTER TABLE releases
  DROP COLUMN IF EXISTS uploader_role,
  DROP COLUMN IF EXISTS rights_declaration_text,
  DROP COLUMN IF EXISTS rights_declaration_version,
  DROP COLUMN IF EXISTS rights_declaration_timestamp,
  DROP COLUMN IF EXISTS rights_declared_by_user_id,
  DROP COLUMN IF EXISTS rights_hold,
  DROP COLUMN IF EXISTS rights_hold_reason,
  DROP COLUMN IF EXISTS rights_hold_placed_at,
  DROP COLUMN IF EXISTS rights_hold_placed_by;

COMMIT;
