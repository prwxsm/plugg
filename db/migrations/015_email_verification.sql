-- Pending registrations have no account or session until email ownership is proven.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
CREATE TABLE IF NOT EXISTS pending_registrations (
 id uuid PRIMARY KEY,
 email text NOT NULL UNIQUE,
 payload jsonb NOT NULL,
 password_hash text NOT NULL,
 code_hash text NOT NULL,
 attempts integer NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL,
 sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pending_registration_expiry ON pending_registrations(expires_at);
CREATE TABLE IF NOT EXISTS registration_email_budget (
 day date PRIMARY KEY,
 attempts integer NOT NULL DEFAULT 0
);
