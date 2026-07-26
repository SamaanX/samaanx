# Auth helpers (`lib/auth`)

Phase 2A-1 — server-side session & guards.

| Export | Purpose |
|--------|---------|
| `getCurrentUser` | Supabase user or null |
| `getCurrentProfile` | Profile for full users (ensures row) |
| `requireUser` | Full user + profile or throw |
| `requireAdmin` | Admin role or throw |
| `requireGuest` | Blocks full authenticated sessions |
| `refreshSession` | Refresh SSR session |
| Route helpers | Public / protected / auth page matching |

Used by Server Actions and (later) Server Components. Not for Client Components directly.
