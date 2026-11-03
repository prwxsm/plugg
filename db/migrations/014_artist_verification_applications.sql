-- Migration 014: Artist Verification Applications Table
-- Stores verification requests submitted by artists for administrative review.

CREATE TABLE IF NOT EXISTS artist_verification_applications (
    id                      TEXT PRIMARY KEY,
    artist_id               TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    user_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stage_name              TEXT NOT NULL,
    legal_name              TEXT NOT NULL,
    contact_email           TEXT NOT NULL,
    contact_phone           TEXT DEFAULT '',
    country                 TEXT DEFAULT '',
    city                    TEXT DEFAULT '',
    primary_genre           TEXT DEFAULT '',
    supporting_links        JSONB NOT NULL DEFAULT '[]'::jsonb,
    note                    TEXT DEFAULT '',
    status                  TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, more_info_required
    admin_feedback          TEXT,
    reviewed_at             TIMESTAMPTZ,
    reviewer_id             TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure optional fields allow NULL values if table was created with strict NOT NULL constraints
ALTER TABLE artist_verification_applications ALTER COLUMN contact_phone DROP NOT NULL;
ALTER TABLE artist_verification_applications ALTER COLUMN country DROP NOT NULL;
ALTER TABLE artist_verification_applications ALTER COLUMN city DROP NOT NULL;
ALTER TABLE artist_verification_applications ALTER COLUMN primary_genre DROP NOT NULL;
ALTER TABLE artist_verification_applications ALTER COLUMN note DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_artist_verification_artist ON artist_verification_applications(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_verification_user ON artist_verification_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_verification_status ON artist_verification_applications(status);
