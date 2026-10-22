-- 002_plays_table.sql
-- Record track play events for analytics and anti-gaming play counts

CREATE TABLE IF NOT EXISTS plays (
    id                      TEXT PRIMARY KEY,
    track_id                TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    user_id                 TEXT REFERENCES users(id) ON DELETE SET NULL,
    session_id              TEXT,
    ip_address              TEXT,
    duration_played_seconds INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plays_track ON plays(track_id);
CREATE INDEX IF NOT EXISTS idx_plays_user ON plays(user_id);
CREATE INDEX IF NOT EXISTS idx_plays_created_at ON plays(created_at);
