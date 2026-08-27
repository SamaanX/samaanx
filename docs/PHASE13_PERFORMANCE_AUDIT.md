# Phase 13 — SamaanX Performance Audit & Optimization Report

**Date:** August 27, 2026  
**Scope:** Full application — routes, APIs, DB, navigation, mobile UX, realtime, TanStack Query

---

## Executive summary

Automated audit covered **43 pages**, **12 API handlers**, **5 layouts**, and **50+ Server Actions**. High-impact optimizations were applied without removing features or weakening auth. Mobile bottom navigation and AI FAB positioning were implemented. Remaining items are documented below with priority.

---

## 1. Inventory

| Category | Count |
|----------|------:|
| App pages | 43 |
| API routes | 12 |
| Layouts | 5 |
| Existing `loading.tsx` (before) | 14 |
| New `loading.tsx` (Phase 13) | 3 |
| Server Action modules (major) | ~35 |

### Route groups

- **Marketplace** (public): `/`, `/search`, `/categories`, `/listings/[slug]`, `/profile/[id]`
- **App** (auth): `/profile`, `/rentals`, `/chat`, `/wishlist`, `/seller/*`, `/notifications`, `/help`, `/feedback`
- **Auth**: `/login`, `/signup`, `/forgot-password`, `/reset-password`
- **Admin**: `/admin/*` (13 pages)
- **Root**: `/offline`, `/maintenance`, `/forbidden`, `/api-docs`

### API endpoints

`/api/ai/chat`, `/api/cron/jobs`, `/api/openapi`, `/api/v1/auth/session`, `/api/v1/categories`, `/api/v1/listings`, `/api/v1/listings/[slug]`, `/api/v1/wishlist`, `/api/v1/wishlist/[listingId]`, `/api/v1/seller/listings/[id]`, `/auth/callback`, `/api/test/sentry-error`

---

## 2. Optimizations implemented (Phase 13)

### Mobile UX
| Change | Files |
|--------|-------|
| **Mobile bottom nav** — Home, Search, Wishlist, Rentals, Profile (buyer); seller variant for listings/requests | `components/layout/mobile-bottom-nav.tsx`, `(app)/layout.tsx`, `(marketplace)/layout.tsx` |
| **AI FAB repositioned** above bottom nav + safe-area; lazy-load AI panel | `features/ai/components/ai-assistant-widget.tsx`, `app/globals.css` |
| **Main content bottom padding** for nav clearance | Both app + marketplace layouts |
| **Hamburger menu trimmed** — primary tabs removed from duplicate mobile menu | `components/layout/site-header.tsx` |

### Database / Server
| Change | Files |
|--------|-------|
| **Review eligibility** — single rental query instead of loading 40 rentals | `features/reviews/queries/reviews.ts` |
| **Chat thread action** — parallel header + messages fetch | `features/chat/actions/chat-actions.ts` |
| **Listing detail cache dates** — rehydrate after `unstable_cache` (prior fix) | `features/search/queries/listing-detail.ts` |

### Client / TanStack Query
| Change | Files |
|--------|-------|
| **Seller listings panel** — `staleTime: 30s`, no refetch-on-mount when SSR seed exists | `features/listings/components/seller-listings-panel.tsx` |
| **Create listing redirect** — removed triple-fetch (`fetchQuery` + `router.refresh`) | `features/listings/components/listing-form.tsx` |
| **Chat inbox** — `refetchOnWindowFocus: false` (align global default) | `features/chat/hooks/use-chat.ts` |

### Realtime
| Change | Files |
|--------|-------|
| **Removed unfiltered global `messages` postgres subscription** — was delivering every message INSERT to every user | `features/chat/hooks/use-chat.ts` |

### Loading UX
| Change | Files |
|--------|-------|
| Segment loading for `(app)` | `app/(app)/loading.tsx` |
| Chat loading skeleton | `app/(app)/chat/loading.tsx` |
| Wishlist loading skeleton | `app/(app)/wishlist/loading.tsx` |

### Service worker (prior session, related)
| Change | Files |
|--------|-------|
| Push-only SW — no fetch interception | `public/sw.js` |

### SQL indexes (new migration)
| File | Purpose |
|------|---------|
| `supabase/sql/023_phase13_perf_indexes.sql` | Wishlist batch, seller listings, chat inbox sort, announcement dismissals |

---

## 3. N+1 / duplicate query findings

### Fixed
- Review page loading 40 rentals to find one → **fixed**
- Seller listings SSR + immediate client refetch → **fixed**
- Create listing post-submit triple network round-trip → **fixed**
- Global chat messages postgres fan-out → **removed**

### Remaining (documented, not yet implemented)
| Priority | Issue | Location |
|----------|-------|----------|
| P0 | Broadcast recipient full-table profile scan | `features/announcements/services/recipients.ts` |
| P1 | Middleware + RSC double Supabase `getUser()` | `lib/supabase/middleware.ts`, `lib/auth/session.ts` |
| P1 | Unbounded seller listings query | `features/listings/queries/categories.ts` |
| P1 | Announcement dismissals load all rows for `notIn` | `features/announcements/queries/active-announcements.ts` |
| P1 | Notification prefs fetched per delivery event | `features/notifications/services/dispatch.ts` |
| P1 | Verification panel refetch storm | `features/verification/components/verification-panel.tsx` |
| P2 | Admin dashboard 13 parallel counts | `features/admin/queries/dashboard-stats.ts` |
| P2 | Realtime unfiltered `rental_confirmations` / `reviews` | `providers/realtime-sync-provider.tsx` |

---

## 4. Navigation audit

### Full reload patterns (intentional)
- Post-login/signup: `window.location.assign` — required for cookie refresh
- OAuth: external redirect

### `router.refresh()` call sites (8)
Most are post-mutation admin/settings flows. Create listing no longer uses refresh.

### Prefetch
- Site header prefetches buyer/seller primary routes on auth

---

## 5. TanStack Query defaults

**Global** (`providers/query-provider.tsx`): `staleTime: 30s`, `refetchOnWindowFocus: false`

Per-query overrides documented in audit; seller listings and chat inbox aligned in Phase 13.

---

## 6. Realtime subscriptions

| Provider | Channels | Cleanup |
|----------|----------|---------|
| `RealtimeSyncProvider` | rentals, verifications, notifications, reviews, confirmations | Yes |
| `ChatRealtimeHost` | user + thread channels | Yes |
| `PresenceHost` | presence + last seen | Yes |

Phase 13 removed highest-risk global messages postgres listener.

---

## 7. Create listing flow

**Before:** beginCreate → upload → register → `fetchQuery(staleTime:0)` → `router.refresh()` → panel `refetchOnMount: always`

**After:** beginCreate → upload → register → `bumpLiveSurfaces` + `router.replace` only

**Remaining:** client-side image compression before upload (recommended P1)

---

## 8. Bundle / code splitting

Already good: lazy maps, emoji picker, rental dialog, AI panel (now dynamic in Phase 13)

Remaining: framer-motion on seller listing cards (P2)

---

## 9. Performance targets

| Metric | Target | Notes |
|--------|--------|-------|
| LCP | < 2.5s | Listing detail cached 60s; home streams via Suspense |
| INP | < 200ms | Chat instant send (prior Phase); optimistic UI on wishlist |
| CLS | < 0.1 | Bottom nav uses fixed height CSS var |

Enable `PERF_CHAT=1` and `NEXT_PUBLIC_PERF_CHAT=1` for chat timing logs.

---

## 10. Migrations required

Run in Supabase SQL editor (if not already applied):

1. `010_perf_indexes.sql`
2. `015_perf_indexes.sql` (partial indexes — critical)
3. `017_rental_verification_one_current.sql`
4. `020_announcements_delivery.sql`
5. `021_phase12_push.sql`
6. `022_announcement_push.sql`
7. **`023_phase13_perf_indexes.sql`** (new)

---

## 11. Verification

```
npm run typecheck  ✅
npm run lint       ✅
npm run build      ✅
```

### Regression checklist (manual)
- [ ] Mobile bottom nav — all 5 tabs, active states
- [ ] AI button — no overlap with nav or listing CTA
- [ ] Chat send — instant + peer delivery
- [ ] Create listing — publish without long wait
- [ ] Wishlist toggle — optimistic
- [ ] Push notifications — still work (SW push-only)
- [ ] Login/signup — full navigation still works

---

## 12. Files modified (Phase 13)

**Created:**
- `components/layout/mobile-bottom-nav.tsx`
- `app/(app)/loading.tsx`
- `app/(app)/chat/loading.tsx`
- `app/(app)/wishlist/loading.tsx`
- `supabase/sql/023_phase13_perf_indexes.sql`
- `docs/PHASE13_PERFORMANCE_AUDIT.md`

**Modified:**
- `app/(app)/layout.tsx`
- `app/(marketplace)/layout.tsx`
- `app/globals.css`
- `components/layout/site-header.tsx`
- `features/ai/components/ai-assistant-widget.tsx`
- `features/listings/components/seller-listings-panel.tsx`
- `features/listings/components/listing-form.tsx`
- `features/chat/hooks/use-chat.ts`
- `features/chat/actions/chat-actions.ts`
- `features/reviews/queries/reviews.ts`

---

## 13. Remaining bottlenecks (next iteration)

~~1. Announcement broadcast recipient resolution at scale~~ ✅ Phase 13.1  
~~2. Middleware auth deduplication with RSC~~ ✅ Phase 13.1  
~~3. Seller listings pagination~~ ✅ Phase 13.1  
~~4. Verification panel realtime refetch reduction~~ ✅ Phase 13.1  
~~5. Client-side image compression on create listing~~ ✅ Phase 13.1  
~~8. pg_trgm indexes for ILIKE search~~ ✅ Phase 13.1  

6. Additional `loading.tsx` for seller edit/new, review page
7. `(app)` and `(admin)` segment `error.tsx` boundaries
9. Global `rental_confirmations` postgres_changes listener (no user filter — backup path only)
10. Rental dashboard soft cap (80) — load-more if history exceeds cap
11. Admin dashboard parallel stat queries (already batched in places)

---

## 14. Phase 13.1 — Completed optimizations

### 1. Announcement broadcast (P0)
- **Before:** Loaded all recipient profile IDs into memory, then fanned out.
- **After:** Cursor-paginated chunks (`250`/`fetchAnnouncementRecipientChunk`), count via `countAnnouncementRecipients`, per-chunk `createMany` + push in `notify.ts`.
- **Files:** `features/announcements/services/recipients.ts`, `features/announcements/services/notify.ts`

### 2. Auth double call
- **Before:** Middleware `getUser()` + RSC tree `getUser()` = 2 Supabase RTTs on protected routes.
- **After:** Middleware sets `x-middleware-auth-validated` + `x-middleware-user-id`; RSC `getCurrentUser()` reuses validated session via `getSession()` when IDs match (falls back to `getUser()` if mismatch).
- **Files:** `lib/supabase/middleware.ts`, `lib/auth/middleware-auth.ts`, `lib/auth/session.ts`

### 3. Seller listings pagination
- **Before:** Unbounded `getSellerListings()` on SSR + client refetch.
- **After:** Cursor pagination (`SELLER_LISTINGS_PAGE_SIZE = 20`), `useInfiniteQuery` with SSR first page + “Load more”.
- **Files:** `features/listings/queries/categories.ts`, `features/listings/actions/get-seller-listings.ts`, `features/listings/components/seller-listings-panel.tsx`, `app/(app)/seller/listings/page.tsx`

### 4. Client-side image compression
- **Before:** Raw files uploaded up to 5 MB each.
- **After:** Canvas resize (max 2048px edge), JPEG/WebP quality ~0.86, skip files &lt;180 KB, preserve PNG when alpha present; previews unchanged (compress at upload only).
- **Files:** `lib/images/compress-listing-image.ts`, `features/listings/services/upload-listing-images-client.ts`

### 5. Verification refetch storm
- **Before:** `staleTime: 0`, `fetchLatestStatus()` after every sync event, mutation, and `useRealtimeRentalSync` callback (3× refetch per action).
- **After:** `staleTime: 30s`, live-sync patches only (no refetch on peer events), mutations with cache patch skip refetch, removed redundant `useRealtimeRentalSync` refetch (global invalidation handles backup path), expire countdown still invalidates targeted query.
- **Files:** `features/verification/components/verification-panel.tsx`

### 6. pg_trgm search indexes
- **Migration:** `supabase/sql/024_phase13_trgm_search.sql`
- GIN trigram indexes on `listings` (title, description, city, area), `profiles` (display_name, email), `categories` (name) — matches Prisma `contains` + `mode: "insensitive"` (ILIKE `%term%`).

### Verification
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅

### Migrations to apply in Supabase (in order)
`010` → `015` → `017` → `020`–`023` → **`024_phase13_trgm_search.sql`**

---

## 15. Files modified (Phase 13.1)

**Created:**
- `lib/auth/middleware-auth.ts`
- `lib/images/compress-listing-image.ts`
- `supabase/sql/024_phase13_trgm_search.sql`

**Modified:**
- `lib/supabase/middleware.ts`
- `lib/auth/session.ts`
- `features/announcements/services/recipients.ts`
- `features/announcements/services/notify.ts`
- `features/listings/queries/categories.ts`
- `features/listings/actions/get-seller-listings.ts`
- `features/listings/components/seller-listings-panel.tsx`
- `features/listings/services/upload-listing-images-client.ts`
- `features/verification/components/verification-panel.tsx`
- `app/(app)/seller/listings/page.tsx`
- `docs/PHASE13_PERFORMANCE_AUDIT.md`

---

*Phase 13.1 complete. No business logic removed; no auth weakened.*
