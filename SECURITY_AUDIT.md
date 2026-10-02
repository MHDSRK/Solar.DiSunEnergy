# Production Security Audit

Date: 2026-09-26

## Verified security controls

- Admin APIs require the HMAC session through `requireAdmin()`.
- Admin sessions contain partner identity and use HMAC SHA-256 with constant-time signature comparison.
- Admin password verification uses the existing password helper and login rate limiting.
- Admin lead mutations create audit records.
- Database writes use parameterized Neon queries.
- Public lead authorization remains token-based and rate-limited.
- Follow-up cron requires `CRON_SECRET`.
- Destructive lead deletion requires an authenticated admin action and explicit UI confirmation.
- Proposal and Forms Filling pages are server-gated with `requireAdmin()`.
- Production response headers are configured in the single active `next.config.ts`: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP, and X-Permitted-Cross-Domain-Policies. The CSP explicitly permits the pinned pdf-lib CDN used by authenticated PDF tools. This must be verified against the Vercel build/runtime after deployment.
- PDF processing is client-side; uploaded customer PDFs are not sent to the PDF library CDN.

## PDF tooling / CSP note

- Proposal Maker and Forms Filling lazy-load pinned pdf-lib 1.17.1 from `cdn.jsdelivr.net`. The active CSP explicitly allows `https://cdn.jsdelivr.net` in `script-src`; keep that dependency pinned or self-host it before tightening the policy further.

## Residual operational gates

1. Set the same strong `CRON_SECRET` in Vercel and GitHub Actions.
2. Confirm the configured WhatsApp recipient/team routing remains intentional.
3. Approve/configure the `disun_followup_reminder` WhatsApp template before relying on automated reminders.
4. Upload the actual current 7-page proposal template once in Proposal PDF Maker.
5. Add each required government/KSEB form PDF to Forms Filling; non-fillable forms use coordinate overlays.
6. The PDF tools lazy-load pinned pdf-lib 1.17.1 from jsDelivr. This is intentionally isolated to authenticated admin tools; self-hosting the library can remove the remaining third-party CDN dependency.

## Release gate

Do not declare production release complete until the Vercel deployment for the final Main commit reports success and the smoke tests below pass:

- public lead submission
- admin login/logout
- manual lead creation/edit/audit
- follow-up create/DONE/SNOOZE
- cron authorization
- payment add/delete
- project stage update
- report/CSV export
- proposal generation
- form filling
- advanced calculator
