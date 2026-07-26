# SamaanX — Phase 1C: Database Infrastructure

**Status:** Phase 1C-A complete (seed + planning docs)  
**Architecture:** v1.2 (frozen)  
**Depends on:** Phase 0, 1A, 1B (schema pushed to Supabase)

---

## 1. Database overview

| Item | Value |
|------|-------|
| Provider | Supabase PostgreSQL |
| ORM | Prisma 6 |
| Schema source | `prisma/schema.prisma` (Phase 1B) |
| Public tables | `profiles`, `categories`, `listings`, `listing_images`, `listing_availability`, `rentals`, `rental_verifications`, `rental_confirmations`, `conversations`, `messages`, `reviews`, `wishlists`, `notifications`, `reports`, `audit_logs` |
| Identity | Supabase `auth.users` — `profiles.id` matches auth user id |
| Guests | No profile row |

Money uses `Decimal`; timestamps use `timestamptz`; JSON payloads use `jsonb` where approved.

---

## 2. Seed strategy

| Concern | Approach |
|---------|----------|
| Entry point | `prisma/seed.ts` |
| Runner | `tsx` via `package.json` → `prisma.seed` |
| Command | `npm run db:seed` or `npx prisma db seed` |
| Idempotent | `upsert` on `Category.slug` |
| Scope (1C-A) | **Categories only** |
| Safe to re-run | Yes — updates name/icon/sortOrder/isActive; no duplicates |

### Seeded categories (MVP)

| sortOrder | Name | slug | icon (Lucide) |
|----------:|------|------|---------------|
| 10 | Electronics | electronics | Cpu |
| 20 | Mobiles | mobiles | Smartphone |
| 30 | Laptops | laptops | Laptop |
| 40 | Cameras | cameras | Camera |
| 50 | Vehicles | vehicles | Car |
| 60 | Bikes | bikes | Bike |
| 70 | Furniture | furniture | Armchair |
| 80 | Home Appliances | home-appliances | Refrigerator |
| 90 | Gaming | gaming | Gamepad2 |
| 100 | Sports | sports | Dumbbell |
| 110 | Fashion | fashion | Shirt |
| 120 | Tools | tools | Wrench |
| 130 | Musical Instruments | musical-instruments | Music |
| 140 | Event Equipment | event-equipment | PartyPopper |
| 150 | Baby Products | baby-products | Baby |
| 160 | Books | books | BookOpen |
| 999 | Others | others | LayoutGrid |

Future seeds (later phases): demo profiles/listings only in staging — never production user data.

---

## 3. Future tables / data growth

Already created (empty until product phases):

- Listings + images + availability
- Rentals + verifications + confirmations
- Conversations + messages
- Reviews, wishlists, notifications, reports, audit_logs

No additional tables in 1C-A.

---

## 4. Migration strategy

| Environment | Approach |
|-------------|----------|
| Local / early MVP | `prisma db push` acceptable for rapid sync (already used) |
| Staging / Production | Prefer `prisma migrate` with committed SQL migrations |
| Pooler | `DATABASE_URL` = transaction pooler; `DIRECT_URL` = session/direct for migrate/push |
| Partial unique (verifications) | Add SQL in a later migration: one `is_current = true` per `(rental_id, stage)` |
| Check constraints | Add via migration SQL when product rules harden (rating 1–5, deposit coherence, etc.) |

**Recommended next infra step (Phase 1C-B candidate):** baseline migration from current schema + RLS policies.

---

## 5. Supabase Storage plan (planning only — no buckets created in 1C-A)

| Bucket | Visibility | Purpose | Notes |
|--------|------------|---------|-------|
| `listing-images` | **Public** read (or signed URLs if preferred) | Listing gallery (1–10, ≤5MB) | Write: owner seller only |
| `avatars` | **Public** read | Profile avatars | Write: owner user only |
| `verification-assets` | **Private** | Optional QR/debug artifacts if ever stored | Prefer render QR from payload; avoid storing PINs |
| `documents` | **Private** | Future docs (not KYC MVP) | Admin + owner |
| `chat-media` | **Private** | Future chat attachments | Parties of conversation only |

Path convention (future): `{bucket}/{userId|listingId}/{uuid}.{ext}`

CDN / transforms: Supabase image transforms or Next.js `Image` + WebP/AVIF (Architecture §15.1).

**1C-A:** document only — do **not** create buckets or upload files yet.

---

## 6. RLS planning (planning only — no SQL in 1C-A)

App currently uses Prisma with the **server service role / DB URL** (bypasses RLS). When browser/Supabase client reads Storage or if any client-side Supabase Data access is introduced, RLS is mandatory.

### Recommended future policies (Phase 1C-B)

| Table | Read | Write |
|-------|------|-------|
| **profiles** | Authenticated: own row; public safe fields for marketplace cards | User updates own row; admin full |
| **categories** | Anyone (active only) | Admin only |
| **listings** | Public: `ACTIVE` + not deleted; owner: all own | Owner create/update; admin moderate |
| **listing_images / availability** | Same as parent listing | Owner of listing |
| **rentals** | Buyer or seller of rental; admin | Buyer create request; seller approve/reject; parties cancel per rules |
| **rental_verifications / confirmations** | Parties of rental | Server/service role preferred for PIN hashes; never expose `pin_hash` to clients |
| **conversations / messages** | Buyer/seller of conversation | Insert message if not `is_readonly`; no update of others’ messages |
| **reviews** | Public read for trust; write only after COMPLETED by party | One per (rental, reviewer) |
| **wishlists** | Owner only | Owner only |
| **notifications** | Owner only | Insert via service role / server; owner mark read |
| **reports** | Reporter: own; admin: all | Authenticated create; admin resolve |
| **audit_logs** | Admin only | Insert via service role only (append-only) |

**Guests:** no auth.uid(); rely on public listing/category read policies only.

**Security note:** PIN hashes and verification secrets must never be selectable by anon/authenticated clients — keep verification mutations on the server (Prisma service connection) even after RLS exists.

---

## 7. Backup recommendations

| Item | Recommendation |
|------|----------------|
| Supabase PITR | Enable on paid plan before public launch |
| Logical dumps | Periodic `pg_dump` of staging/prod for disaster drills |
| Migration history | Commit `prisma/migrations` once migrate workflow starts |
| Secrets | Never commit `.env` / service role keys |
| Seed | Categories only in prod seed; no fake users in production |

---

## 8. Production notes

1. Use pooler URL for app runtime; direct URL for migrations.  
2. Keep Prisma Client generated in CI (`prisma generate`).  
3. Run `npm run db:seed` after fresh environments to ensure categories exist.  
4. Implement RLS + Storage buckets in **Phase 1C-B** before exposing Supabase client-side data access.  
5. Do not soft-delete rentals/reviews/audit/verifications (Phase 1A/1B locked).  
6. Highest Rated sort joins seller `profiles.avg_rating` (MVP).

---

## 9. Commands (1C-A)

```bash
npm run db:seed          # upsert categories
npx prisma db seed       # same via Prisma
npx prisma studio        # inspect tables
```

---

## Document control

| Field | Value |
|-------|-------|
| Phase | 1C-A Database Infrastructure |
| Next | 1C-B (recommended): RLS + Storage bucket setup |
| Explicitly out of scope | Auth, UI, APIs, business logic |
