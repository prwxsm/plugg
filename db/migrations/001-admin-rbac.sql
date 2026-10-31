-- STAGED ONLY: run in one transaction, after explicit owner approval and verified backup.
-- Caller must set LOCAL plugg.bootstrap_user_id to the approved existing user ID.
-- No account is selected by this file. Existing login sessions are preserved.
LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM users WHERE id=current_setting('plugg.bootstrap_user_id',true)
                AND NOT is_mock AND password_hash IS NOT NULL) THEN
   RAISE EXCEPTION 'Select and approve an existing non-seed account with a password before bootstrap';
 END IF;
END $$;
CREATE TABLE admin_bootstrap_rollback (
 user_id text PRIMARY KEY,
 previous_is_admin boolean,
 migration_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO admin_bootstrap_rollback(user_id,previous_is_admin) SELECT id,is_admin FROM users;
CREATE TABLE admin_memberships (
 user_id text PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
 role text NOT NULL CHECK (role IN ('super_admin','admin','moderator')),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admin_audit_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_user_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 actor_role text NOT NULL CHECK (actor_role IN ('super_admin','admin','moderator')),
 action text NOT NULL,
 target_type text NOT NULL,
 target_id text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 reason text,
 before_state jsonb,
 after_state jsonb,
 result text NOT NULL CHECK (result IN ('success','denied','failed'))
);
CREATE INDEX admin_audit_log_occurred_at_idx ON admin_audit_log(occurred_at DESC,id DESC);
CREATE FUNCTION admin_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Administrative audit history is append-only'; END $$;
CREATE TRIGGER admin_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON admin_audit_log
 FOR EACH STATEMENT EXECUTE FUNCTION admin_audit_append_only();
-- One transaction advisory lock serializes role mutations; application operations
-- acquire it BEFORE authorization and target-row reads, under READ COMMITTED.
CREATE FUNCTION protect_final_super_admin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(734821,1);
 IF OLD.active AND OLD.role='super_admin' AND
    (TG_OP='DELETE' OR NOT NEW.active OR NEW.role<>'super_admin') THEN
  IF NOT EXISTS (SELECT 1 FROM admin_memberships WHERE active AND role='super_admin' AND user_id<>OLD.user_id) THEN
    RAISE EXCEPTION 'Cannot remove the final active Super Admin';
  END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.user_id<>OLD.user_id THEN
  RAISE EXCEPTION 'Membership identities cannot be reassigned';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER admin_final_super_admin BEFORE UPDATE OR DELETE ON admin_memberships
 FOR EACH ROW EXECUTE FUNCTION protect_final_super_admin();
CREATE FUNCTION prevent_admin_membership_truncate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Administrative memberships cannot be truncated'; END $$;
CREATE TRIGGER admin_memberships_no_truncate BEFORE TRUNCATE ON admin_memberships
 FOR EACH STATEMENT EXECUTE FUNCTION prevent_admin_membership_truncate();
INSERT INTO admin_memberships(user_id,role) VALUES (current_setting('plugg.bootstrap_user_id'),'super_admin');
-- Deprecated compatibility field is inert, not an alternative authority.
UPDATE users SET is_admin=false;
ALTER TABLE users ALTER COLUMN is_admin SET DEFAULT false;
INSERT INTO admin_audit_log(actor_user_id,actor_role,action,target_type,target_id,reason,after_state,result)
VALUES(current_setting('plugg.bootstrap_user_id'),'super_admin','staff.bootstrap','user',current_setting('plugg.bootstrap_user_id'),
 'Owner-approved initial Super Admin bootstrap',jsonb_build_object('role','super_admin','active',true),'success');
