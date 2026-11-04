# Signup email verification — prepared, not enabled in production

Branch: `codex/email-verification`.

New registrations are validated server-side and saved to `pending_registrations`, not `users` or `artists`. Resend sends an 8-digit cryptographically random code. A successful confirmation creates the user (and artist/analytics when applicable), records `email_verified_at`, consumes the request, and only then creates a session. Codes are bcrypt-hashed, expire after 15 minutes, and lock after five incorrect attempts. Resends require a 60-second cooldown and replace the previous challenge. Signup and resend also have process-local throttling. Persistent delivery budgets cap this feature at 90 attempts per UTC day and 2,800 per UTC month, including failed provider attempts, leaving room below Resend Free's published allowances. These counters do not account for email sent outside this integration.

The same password rule applies to public signup and password changes: at least 15 Unicode characters, a small common-password denylist, and at most 72 UTF-8 bytes to prevent bcrypt truncation. Long passphrases and password-manager passwords work without composition rules. This is a baseline blocklist, not a comprehensive breached-password service.

Existing users and staff keep their login access and passwords. Existing accounts are not falsely marked email-verified. A separate rollout is needed to verify those users or require password changes. Artist badge verification remains a separate review process.

The simulated browser-only change-email code was removed. The server now rejects email-address changes until a real email-change verification flow is built. Password recovery remains explicitly unavailable; this release does not implement recovery delivery.

## Required setup before deployment

1. Create/sign in to Resend on its Free plan. Do not upgrade or enable paid overages.
2. Add a sending subdomain such as `notify.plugg.site` in Resend. Add only Resend's exact verification records to Cloudflare. Preserve existing apex MX, SPF, DKIM, DMARC and other email records. Verify the sending domain in Resend.
3. Create a restricted sending API key for that domain. Store it directly in Render as `RESEND_API_KEY`; never in chat, frontend variables or Git.
4. Set Render `PLUGG_EMAIL_FROM=Plugg <accounts@notify.plugg.site>` to the actual verified sender. There is no test-code fallback. Missing configuration or delivery failures prevent account creation and produce a visible error.
5. Apply `db/migrations/015_email_verification.sql` to the existing Neon database in a transaction. It adds two tables and nullable `users.email_verified_at`; it does not mark existing users verified.
6. Merge this branch into `codex/render-deployment` without rewriting history. Deploy the existing Render service.
7. With an explicitly chosen test inbox, confirm delivery, invalid/expired code handling, resend, listener/artist signup, and sign-in. Do not send unsolicited test emails to real users.

## Checks

- `node --experimental-strip-types scripts/test-email-registration.mjs`: real local PostgreSQL temporary tables, all fixtures rolled back; no external email sent.
- `npx tsc --noEmit`
- `npm run build:node`

The migration can also be applied locally after configuring a real test sender. Do not run database lifecycle tests against production.

Sources: https://resend.com/pricing?product=transactional, https://resend.com/docs/api-reference/emails/send-email, https://pages.nist.gov/800-63-4/sp800-63b.html
