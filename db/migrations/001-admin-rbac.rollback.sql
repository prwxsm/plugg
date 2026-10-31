-- Emergency pre-activation rollback ONLY, in one transaction with application stopped.
-- This restores unsafe legacy flags. Do not expose legacy admin after rollback.
LOCK TABLE users, admin_memberships, admin_audit_log IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
 IF (SELECT count(*) FROM admin_audit_log)<>1 OR
    NOT EXISTS(SELECT 1 FROM admin_audit_log WHERE action='staff.bootstrap') OR
    (SELECT count(*) FROM admin_memberships)<>1 OR
    NOT EXISTS(SELECT 1 FROM admin_memberships m JOIN admin_audit_log a ON a.target_id=m.user_id
               WHERE m.role='super_admin' AND m.active) THEN
   RAISE EXCEPTION 'Post-bootstrap changes exist: preserve audit history and use a forward repair';
 END IF;
END $$;
UPDATE users u SET is_admin=b.previous_is_admin FROM admin_bootstrap_rollback b WHERE b.user_id=u.id;
DROP TABLE admin_memberships;
DROP TABLE admin_audit_log;
DROP TABLE admin_bootstrap_rollback;
DROP FUNCTION protect_final_super_admin();
DROP FUNCTION admin_audit_append_only();

DROP FUNCTION prevent_admin_membership_truncate();
