# Auth feature — Phase 2A-1 Backend Foundation

Server-only authentication foundation (no UI in this phase).

## Contents

- `actions/` — signUp, signIn, signOut, forgot/reset password, Google OAuth, guest, refresh
- `schemas/` — Zod validation
- `services/` — profile sync + error mapping
- `types/` — shared auth types

## Helpers (`lib/auth`)

- `getCurrentUser` / `getSession` / `refreshSession`
- `getCurrentProfile` / `requireUser` / `requireAdmin` / `requireGuest`
- Route classifiers for middleware

## Notes

- Profile.id === auth.users.id
- Guests / anonymous sessions never create profiles
- Google requires provider enabled in Supabase + `/auth/callback` redirect allow-listed
- Anonymous guest requires Anonymous Sign-Ins enabled in Supabase
