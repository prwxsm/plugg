-- 012_audio_quality_review_workflow.sql
-- Add Under Review workflow columns, audio variant metadata, and review duration tracking

-- Ensure enum values exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'under_review' AND enumtypid = 'release_status'::regtype) THEN
    ALTER TYPE release_status ADD VALUE 'under_review';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'changes_required' AND enumtypid = 'release_status'::regtype) THEN
    ALTER TYPE release_status ADD VALUE 'changes_required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'processing' AND enumtypid = 'release_status'::regtype) THEN
    ALTER TYPE release_status ADD VALUE 'processing';
  END IF;
END
$$;

-- Releases review columns
ALTER TABLE releases ADD COLUMN IF NOT EXISTS review_submitted_at TIMESTAMPTZ;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS reviewer_id TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS review_feedback TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS audio_processing_status TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE releases ADD COLUMN IF NOT EXISTS technical_validation JSONB NOT NULL DEFAULT '{}';
ALTER TABLE releases ADD COLUMN IF NOT EXISTS review_history JSONB NOT NULL DEFAULT '[]';

-- Tracks processing and variants columns
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS audio_processing_status TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS technical_validation JSONB NOT NULL DEFAULT '{}';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS audio_variants JSONB NOT NULL DEFAULT '{}';

-- User admin role flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Grant admin role to default staff/admin accounts for development
UPDATE users SET is_admin = TRUE WHERE email IN ('zuri@plugg.fm', 'admin@plugg.fm', 'xsm@plugg.com');

CREATE INDEX IF NOT EXISTS idx_releases_review_submitted ON releases(review_submitted_at);
CREATE INDEX IF NOT EXISTS idx_releases_processing_status ON releases(audio_processing_status);
CREATE INDEX IF NOT EXISTS idx_tracks_processing_status ON tracks(audio_processing_status);
