# Supabase SQL — SamaanX Phase 1C-B

Modular SQL for Row Level Security and Storage.

## Order of execution

Run **in this order** against the Supabase Postgres database (use the **direct / session** connection, not the transaction pooler if DDL fails):

1. `001_enable_rls.sql` — helpers + enable RLS  
2. `002_storage_buckets.sql` — create buckets  
3. `003_storage_policies.sql` — storage.objects policies  
4. `004_table_policies.sql` — table policies  
5. `006_realtime_publication.sql` — live multi-tab UX (rentals, notifications, confirmations)
6. `007_chat_messaging.sql` — message attachments/hides, last_seen, chat-media mimes, RLS
7. `009_realtime_publication_expand.sql` — listings, rental_verifications, reviews (required for full live sync)

### CLI example

```bash
npx prisma db execute --file supabase/sql/001_enable_rls.sql
npx prisma db execute --file supabase/sql/002_storage_buckets.sql
npx prisma db execute --file supabase/sql/003_storage_policies.sql
npx prisma db execute --file supabase/sql/004_table_policies.sql
```

Or paste each file into the Supabase SQL Editor.

## Notes

- Prisma / `service_role` / `postgres` bypass RLS — server app keeps working.
- `rental_verifications` has **no** client write policies and only admin SELECT (PIN hashes stay server-side).
- Storage path convention: `{bucket}/{auth.uid()}/...`
- Policies prefixed with `rentpe_` so they can be dropped/reapplied safely.
- Re-running `003` / `004` drops existing `rentpe_*` policies first.

## Related docs

See `docs/Phase-1C-Security.md`.
