# Phase 10 — Admin Platform

Operations center at `/admin` for `ADMIN` and `SUPER_ADMIN` roles.

## Bootstrap first admin

Run migrations **in order** in Supabase SQL Editor (two separate runs):

1. `supabase/sql/013_phase10_admin_enums.sql`
2. `supabase/sql/013_phase10_admin_platform.sql`

Then promote your account (use SUPER_ADMIN_EMAIL from `.env`):

```sql
UPDATE profiles SET role = 'SUPER_ADMIN' WHERE email = 'samaanx25@gmail.com';
```

Only one super admin is expected for MVP — no separate ADMIN accounts unless you add them manually.

## Routes

- `/admin` — dashboard
- `/admin/users` — user management
- `/admin/listings` — listing moderation
- `/admin/reports` — report queue
- `/admin/disputes` — dispute center
- `/admin/analytics` — marketplace analytics
- `/admin/search` — global search
- `/admin/activity` — audit log
- `/admin/announcements` — platform announcements
- `/admin/settings` — system settings (super admin edit)

## Roles

- **SUPER_ADMIN** — full access, promote admins, system settings
- **ADMIN** — daily moderation (users, listings, reports, disputes)

All admin mutations require a **reason** and write to `audit_logs`.
