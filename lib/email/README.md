# Email (Phase 9)

Transactional email via **Resend** + **React Email** templates.

## Setup

1. Add to `.env`:
   - `RESEND_API_KEY`
   - `EMAIL_FROM` (e.g. `SamaanX <noreply@yourdomain.com>`)
2. Verify sending domain in Resend dashboard.

## Templates

Shared components live in `emails/components/`. The branded layout is `emails/templates/branded-email.tsx`.

Mapped notification types → email templates in `lib/email/types.ts`.

## Sending

- `lib/email/send.ts` — `sendBrandedEmail()` with rate limiting + dedupe (`email_send_logs`).
- Side effects run **after** in-app notifications via `features/notifications/services/dispatch.ts` (non-blocking).
- Welcome email on sign-up via `features/jobs/processor.ts`.

## Notes

- Without `RESEND_API_KEY`, sends are skipped (logged, no UI impact).
- Supabase verify-email / password-reset emails use Supabase Auth by default; branded templates can be wired via Auth hooks later.
