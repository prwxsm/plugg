-- ============================================================================
-- Plugg — PostgreSQL Schema
-- ============================================================================
-- Mirrors the TypeScript interfaces in src/data/types.ts.
-- Run this script in DBeaver against a local Postgres database.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE account_type AS ENUM ('listener', 'artist');
CREATE TYPE release_type AS ENUM ('single', 'EP', 'album');
CREATE TYPE release_status AS ENUM ('published', 'scheduled', 'draft', 'under_review', 'changes_required', 'processing');

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    account_type account_type NOT NULL DEFAULT 'listener',
    avatar_url   TEXT NOT NULL DEFAULT '',
    artist_id    TEXT,  -- nullable; set when account_type = 'artist'
    is_admin     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ARTISTS
-- ---------------------------------------------------------------------------

CREATE TABLE artists (
    id                TEXT PRIMARY KEY,
    username          TEXT NOT NULL UNIQUE,
    display_name      TEXT NOT NULL,
    bio               TEXT NOT NULL DEFAULT '',
    location          TEXT NOT NULL DEFAULT '',
    avatar_url        TEXT NOT NULL DEFAULT '',
    cover_url         TEXT NOT NULL DEFAULT '',
    verified          BOOLEAN NOT NULL DEFAULT FALSE,
    fans              INTEGER NOT NULL DEFAULT 0,
    monthly_listeners INTEGER NOT NULL DEFAULT 0,
    total_plays       BIGINT NOT NULL DEFAULT 0,
    -- social links stored as JSONB for flexibility
    social_links      JSONB NOT NULL DEFAULT '{}',
    phone_number      TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK: users.artist_id → artists.id (deferred so we can insert in any order)
ALTER TABLE users
    ADD CONSTRAINT fk_users_artist
    FOREIGN KEY (artist_id) REFERENCES artists(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------------------
-- GENRES
-- ---------------------------------------------------------------------------

CREATE TABLE genres (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    slug  TEXT NOT NULL UNIQUE,
    image TEXT NOT NULL DEFAULT ''
);

-- ---------------------------------------------------------------------------
-- RELEASES
-- ---------------------------------------------------------------------------

CREATE TABLE releases (
    id                          TEXT PRIMARY KEY,
    artist_id                   TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    title                       TEXT NOT NULL,
    slug                        TEXT NOT NULL,
    type                        release_type NOT NULL DEFAULT 'single',
    cover_url                   TEXT NOT NULL DEFAULT '',
    release_date                DATE NOT NULL,
    status                      release_status NOT NULL DEFAULT 'draft',
    go_live_at                  TIMESTAMPTZ,
    description                 TEXT,
    label                       TEXT,
    review_submitted_at         TIMESTAMPTZ,
    reviewed_at                 TIMESTAMPTZ,
    reviewer_id                 TEXT,
    review_feedback             TEXT,
    audio_processing_status     TEXT NOT NULL DEFAULT 'completed',
    technical_validation        JSONB NOT NULL DEFAULT '{}',
    review_history              JSONB NOT NULL DEFAULT '[]',
    uploader_role               TEXT NOT NULL DEFAULT 'owner',
    rights_declaration_text     TEXT,
    rights_declaration_version  TEXT,
    rights_declaration_timestamp TIMESTAMPTZ,
    rights_declared_by_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
    rights_hold                 BOOLEAN NOT NULL DEFAULT FALSE,
    rights_hold_reason          TEXT,
    rights_hold_placed_at       TIMESTAMPTZ,
    rights_hold_placed_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (artist_id, slug)
);

-- ---------------------------------------------------------------------------
-- TRACKS
-- ---------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS plugg_track_id_seq START WITH 1 INCREMENT BY 1 NO MAXVALUE NO CYCLE;

CREATE TABLE tracks (
    id                      TEXT PRIMARY KEY,
    plugg_track_id          TEXT NOT NULL UNIQUE,
    artist_id               TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    release_id              TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    title                   TEXT NOT NULL,
    slug                    TEXT NOT NULL,
    genre                   TEXT NOT NULL DEFAULT '',
    cover_url               TEXT NOT NULL DEFAULT '',
    audio_url               TEXT,
    duration_seconds        INTEGER NOT NULL DEFAULT 0,
    play_count              BIGINT NOT NULL DEFAULT 0,
    download_count          BIGINT NOT NULL DEFAULT 0,
    like_count              BIGINT NOT NULL DEFAULT 0,
    published               BOOLEAN NOT NULL DEFAULT TRUE,
    release_date            DATE NOT NULL,
    features                TEXT,
    producers               TEXT,
    lyrics                  TEXT,
    recording_type          TEXT NOT NULL DEFAULT 'original',
    has_samples_or_beats    BOOLEAN NOT NULL DEFAULT FALSE,
    sample_details          TEXT,
    isrc                    TEXT,
    file_hash               TEXT,
    audio_processing_status TEXT NOT NULL DEFAULT 'completed',
    technical_validation    JSONB NOT NULL DEFAULT '{}',
    audio_variants          JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (release_id, slug)
);

-- ---------------------------------------------------------------------------
-- RELEASE ↔ TRACK ordering (the TS model uses trackIds[] on Release)
-- ---------------------------------------------------------------------------

CREATE TABLE release_tracks (
    release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    track_id   TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (release_id, track_id)
);

-- ---------------------------------------------------------------------------
-- COPYRIGHT COMPLAINTS
-- ---------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS copyright_complaint_seq START WITH 1 INCREMENT BY 1 NO MAXVALUE NO CYCLE;

CREATE TABLE copyright_complaints (
    id                       TEXT PRIMARY KEY,
    reference                TEXT UNIQUE NOT NULL,
    release_id               TEXT REFERENCES releases(id) ON DELETE SET NULL,
    track_id                 TEXT REFERENCES tracks(id) ON DELETE SET NULL,
    complainant_name         TEXT NOT NULL,
    complainant_email        TEXT NOT NULL,
    rights_holder_represented TEXT,
    work_claimed             TEXT NOT NULL,
    nature_of_infringement   TEXT NOT NULL,
    evidence_notes           TEXT,
    conflict_nature          TEXT,
    status                   TEXT NOT NULL CHECK (status IN ('received', 'under_investigation', 'resolved', 'resolved_takedown', 'resolved_reinstated', 'dismissed')) DEFAULT 'received',
    admin_notes              TEXT,
    resolution_notes         TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at              TIMESTAMPTZ,
    resolved_by              TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- PLAYLISTS
-- ---------------------------------------------------------------------------

CREATE TABLE playlists (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cover_url   TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- PLAYLIST ↔ TRACK ordering (the TS model uses trackIds[] on Playlist)
-- ---------------------------------------------------------------------------

CREATE TABLE playlist_tracks (
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_id    TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (playlist_id, track_id)
);

-- ---------------------------------------------------------------------------
-- LIKES (listener ↔ track)
-- ---------------------------------------------------------------------------

CREATE TABLE likes (
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id   TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, track_id)
);

-- ---------------------------------------------------------------------------
-- FOLLOWS (listener ↔ artist)
-- ---------------------------------------------------------------------------

CREATE TABLE follows (
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id  TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, artist_id)
);

-- ---------------------------------------------------------------------------
-- ANALYTICS — snapshot table for artist stats
-- ---------------------------------------------------------------------------
-- In production this would likely be computed from plays/events, but we
-- model it as a concrete table so mock data can be loaded and queried.

CREATE TABLE artist_analytics (
    artist_id         TEXT PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE,
    total_plays       BIGINT NOT NULL DEFAULT 0,
    monthly_listeners INTEGER NOT NULL DEFAULT 0,
    fans              INTEGER NOT NULL DEFAULT 0,
    growth_percent    NUMERIC(6,2) NOT NULL DEFAULT 0
);

CREATE TABLE analytics_timeline (
    id          SERIAL PRIMARY KEY,
    artist_id   TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    label       TEXT NOT NULL,         -- e.g. 'Mar', 'Apr'
    plays       BIGINT NOT NULL DEFAULT 0,
    listeners   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE analytics_recent_plays (
    id          SERIAL PRIMARY KEY,
    artist_id   TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    track_id    TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    city        TEXT NOT NULL DEFAULT '',
    minutes_ago INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE analytics_release_performance (
    artist_id  TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    plays      BIGINT NOT NULL DEFAULT 0,
    saves      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (artist_id, release_id)
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX idx_tracks_artist   ON tracks(artist_id);
CREATE INDEX idx_tracks_plugg_id ON tracks(plugg_track_id);
CREATE INDEX idx_tracks_release  ON tracks(release_id);
CREATE INDEX idx_tracks_genre    ON tracks(genre);
CREATE INDEX idx_releases_artist ON releases(artist_id);
CREATE INDEX idx_releases_status ON releases(status);
CREATE INDEX idx_playlists_user  ON playlists(user_id);
CREATE INDEX idx_likes_track     ON likes(track_id);
CREATE INDEX idx_follows_artist  ON follows(artist_id);

COMMIT;
