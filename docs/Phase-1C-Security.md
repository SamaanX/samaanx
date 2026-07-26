# SamaanX — Phase 1C-B: Security & Storage

**Status:** Implemented (SQL applied / ready to apply)  
**Architecture:** v1.2 frozen  
**Depends on:** Phase 1B schema + 1C-A seed

---

## 1. RLS overview

Row Level Security is **enabled + forced** on all public application tables.

| Role | Behaviour |
|------|-----------|
| `anon` / `authenticated` (Supabase JWT) | Subject to RLS policies |
| Prisma DB URL / `postgres` / `service_role` | Bypasses RLS (server-side app) |

Helper functions (SECURITY DEFINER):

- `is_admin()`
- `is_rental_party(uuid)`
- `owns_listing(uuid)`
- `is_conversation_participant(uuid)`
- `conversation_is_writable(uuid)`

SQL lives in `supabase/sql/`.

---

## 2. Bucket overview

| Bucket | Public | Max size | Use |
|--------|--------|----------|-----|
| `listing-images` | Yes | 5 MB | Listing gallery |
| `avatars` | Yes | 2 MB | Profile photos |
| `verification-assets` | No | 5 MB | Optional verification assets (prefer on-the-fly QR) |
| `documents` | No | 10 MB | Future private docs |
| `chat-media` | No | 10 MB | Future chat attachments |

**Path convention:** `{bucket}/{auth.uid()}/...`  
Chat media may use `{bucket}/{auth.uid()}/{conversationId}/...`

No files uploaded in this phase.

---

## 3. Policy summary (tables)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Public ACTIVE; own/admin any | Own | Own/admin | — |
| categories | Active (or admin) | Admin | Admin | Admin |
| listings | ACTIVE public; own/admin | Own seller | Own/admin | Own/admin |
| listing_images | Via parent listing visibility | Listing owner | Owner | Owner |
| listing_availability | Via parent listing | Owner | Owner | Owner |
| rentals | Buyer/seller/admin | As buyer | Parties/admin | — |
| rental_verifications | **Admin only** (no client writes) | Service role | Service role | Service role |
| rental_confirmations | Parties/admin | Service role | Parties/admin | — |
| conversations | Parties/admin | Service role | Parties/admin | — |
| messages | Participants | Sender if not readonly | Participants (e.g. read) | — |
| reviews | Public | Reviewer + party | Own/admin | — |
| wishlists | Owner | Owner | — | Owner |
| notifications | Owner | Service role | Owner (read) | — |
| reports | Reporter/admin | Reporter | Admin | — |
| audit_logs | Admin | Service role | — | — |

---

## 4. Security decisions

1. **Least privilege** for JWT roles; privileged writes via server/Prisma.  
2. **PIN / QR secrets** never writable/readable by normal users via PostgREST — `rental_verifications` locked down.  
3. **Guests** use `anon` public SELECT on active listings/categories/reviews/profiles only.  
4. **Conversation read-only** enforced on message INSERT via `conversation_is_writable`.  
5. **Storage** public buckets allow public read; private buckets require auth + folder ownership / participation.  
6. Policy names prefixed `rentpe_` for safe re-apply.

---

## 5. Production checklist

- [ ] Confirm SQL applied on staging and production  
- [ ] Verify buckets in Supabase Dashboard → Storage  
- [ ] Verify RLS enabled on all 15 tables  
- [ ] Test anon cannot read rentals / messages / wishlists  
- [ ] Test authenticated user cannot read another user’s notifications  
- [ ] Never expose `pin_hash` in any API response  
- [ ] Keep service role key server-only  
- [ ] Enable Supabase PITR before public launch  
- [ ] Add partial unique index for current verifications (later migration)  
- [ ] Review Storage MIME/size limits after first upload feature  

---

## 6. How to re-apply

See `supabase/sql/README.md`.

---

## Document control

| Field | Value |
|-------|-------|
| Phase | 1C-B Supabase Security & Storage |
| Next | Product phases (auth, listings, …) after approval |
