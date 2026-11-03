# Cloud deployment inventory — 31 October 2026

Read-only account inspection; no DNS, bucket permissions, deployments, billing plans, or database schema/data changed.

## Cloudflare

Account: prwxsm. Domain: plugg.site, Free plan, full DNS setup.

- Workers & Pages reports no projects. Account Worker subdomain: prwxsm.workers.dev.
- DNS has 11 records; no admin.plugg.site record.
- Apex A record points to 216.198.79.1 and is proxied.
- www CNAME targets a5ade72423639834.vercel-dns-017.com (DNS only).
- auth CNAME targets an existing Supabase project (proxied). Preserve until its current use is established; the current Plugg backend uses its own PostgreSQL sessions.
- cdn.plugg.site is an R2-managed record for plugg-media.
- Existing MX/SPF and Google verification records must be preserved.

## R2 plugg-media

- Western Europe; Standard storage; created July 5, 2026.
- Bucket summary reports 65 B; object listing showed test-upload.txt (36 B). No application-media folders were shown.
- Public access enabled through active custom domain cdn.plugg.site and an enabled r2.dev development URL.
- Custom-domain minimum TLS currently shown as 1.0.
- No CORS policy, bucket locks or enabled event notifications.
- Default incomplete-multipart cleanup enabled after seven days.

Do not migrate private masters, unreleased audio or private documents into this publicly readable bucket. Recommended: retain it for intentionally public assets and use a separate private bucket for protected media, with authorization enforced by the backend. Even published audio may need protected delivery if takedowns must revoke access promptly. CORS alone does not provide access control.

## Neon

- Project plugg (fancy-sound-22886340), default branch production (br-lingering-credit-asmow0jb).
- Free plan; AWS Europe Central 1 (Frankfurt); PostgreSQL 18.
- Database neondb, owner neondb_owner. Dashboard storage about 32.15 MB; compute scales 0.25–2 CU, history retention six hours.
- Executed only a SELECT against information_schema.tables.
- Nine existing base tables, all in neon_auth: account, invitation, jwks, member, organization, project_config, session, user, verification.
- No Plugg public application tables found. Preserve neon_auth during migration; do not restore with destructive database-wide clean/drop commands.

## Code and next sequence

Both local projects have GitHub remotes: prwxsm/plugg and prwxsm/plugg-admin.

1. Prepare Docker-compatible Node backend/FFmpeg deployment, private media storage adapter, and Cloudflare admin proxy configuration.
2. Choose where the Docker workload runs. Cloudflare Containers requires Workers Paid; no paid subscription has been authorized or activated. Docker packaging alone does not provide hosting.
3. Take a fresh local database and upload backup. Restore only the Plugg application schema/data to a staging target while preserving existing Neon-managed schemas. Verify constraints, triggers, roles and row counts before production cutover.
4. Copy and verify media to appropriate private/public storage; keep database references consistent.
5. Deploy backend and admin to staging URLs, test all roles/upload/transcoding/review/publication/takedown flows.
6. Attach admin.plugg.site to the verified admin deployment; do not alter existing root/www/auth/email records prematurely.

Cloudflare and Neon dashboards were accessible after user sign-in. No credentials were retrieved or saved during this inventory.
