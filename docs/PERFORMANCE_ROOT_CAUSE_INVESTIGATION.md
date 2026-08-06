# SamaanX — Performance & Realtime Root-Cause Investigation

**Date:** July 26, 2026  
**Scope:** Investigate remaining UX symptoms without blind caching, indexes, or business-logic changes.  
**Status:** Investigation only — no fixes committed at time of writing.

---

## Symptoms Investigated

1. My Listings is slow.
2. Chat messages deliver noticeably slower than TeamSync.
3. Rental handover requires manual refresh.
4. Return confirmation requires manual refresh.
5. Some realtime updates still require refresh.
6. Navigation occasionally feels delayed.

---

## Architecture Comparison: SamaanX vs TeamSync (Benchmark)

TeamSync source is unavailable; comparison is against its **stated behavior** vs what SamaanX actually does.

| Capability | TeamSync (expected) | SamaanX (actual) | Gap |
|---|---|---|---|
| Peer sync transport | Server pushes update immediately | Rental/verification: server `wakeUsersLiveSync` **deferred** via `after()` + client-only `notifyUsersLiveSync` | Peer wake depends on mutator tab + optional service key |
| Chat delivery | Sub-second, no refresh | Message DB insert via Server Action **first**, then **client** `fanoutMessage` | Recipient waits for full action RTT + broadcast subscribe |
| Verification state | Instant on both sides | `VerificationPanel` has **no dedicated realtime hook**; relies on broadcast → 160ms debounce → invalidate → refetch | No direct cache patch; postgres backup **impossible** for `rental_verifications` (RLS) |
| Subscription startup | Active on auth | `userId` starts **`null`** until header Suspense resolves | Subscriptions miss events during startup window |
| Postgres fallback | Direct payload patch | Chat fallback = **`invalidateQueries` + full refetch** | 2nd server round-trip on broadcast miss |

---

## Symptom 1: My Listings is Slow

### Evidence Chain

**Network / server waterfall (every navigation to `/seller/listings`):**

- File: `app/(app)/seller/listings/page.tsx` (lines 17–31)
- Sequential: `requireUser()` → `getSellerListings(profileId)` — blocks full HTML response.

**Middleware auth RTT (every protected navigation):**

- File: `proxy.ts` (lines 10–12)
- `updateSession(request)` calls Supabase `getUser()` on every protected route.
- `/seller/*` is protected (`lib/auth/routes.ts` lines 14–21).

**DB query (same query runs twice on many visits):**

- File: `features/listings/queries/categories.ts` (lines 43–74)
- `prisma.listing.findMany` with category + images join.

**Duplicate client refetch on tab focus:**

- File: `features/listings/components/seller-listings-panel.tsx` (lines 16–29)
- `refetchOnWindowFocus: true` triggers `getSellerListingsAction()`.
- File: `features/listings/actions/get-seller-listings.ts` (lines 12–14)
- Action calls `requireUser()` again + same Prisma query.

### Root Cause

1. **Blocking RSC waterfall** — `requireUser` → `getSellerListings` sequential with no Suspense around listings.
2. **Double fetch architecture** — Server renders initial data; client may refetch via Server Action on window focus.
3. **No streaming** — Unlike header notifications (Suspense), listings page body is fully blocked.
4. **Proxy auth tax** — Every visit pays Supabase session validation before RSC starts.

### Why UI Feels Slow (Not Missing Indexes)

Slowness is **request waterfall + duplicate round-trips**, not query plan. Even with indexes, you still pay: `proxy.updateSession` + `requireUser` + Prisma + optional `getSellerListingsAction`.

### Recommended Fix

| Fix | Location | Expected Improvement |
|---|---|---|
| Stream listings in Suspense boundary | `app/(app)/seller/listings/page.tsx` | Header/shell paints immediately |
| Parallelize auth + query where safe | same page | ~1 sequential hop removed |
| Set `refetchOnWindowFocus: false` when RSC seed is fresh | `seller-listings-panel.tsx:28` | Eliminates duplicate Server Action on tab focus |
| Pass `profileId` from RSC to avoid re-auth in action | `get-seller-listings.ts` | Cuts action latency |

**Expected:** First paint 200–800ms faster; tab-focus visits avoid duplicate fetch.

---

## Symptom 2: Chat Messages Deliver Slower Than TeamSync

### Evidence Chain

**Send path — blocking Server Action before peer notification:**

- File: `features/chat/hooks/use-chat.ts` (lines 591–638)
- Flow: optimistic patch (sender) → `await sendChatTextMessageAction()` → `void fanoutMessage(confirmed)`.
- Peer receives nothing until action returns.

**Server action hot path:**

- File: `features/chat/actions/chat-actions.ts` (lines 171–264)
- `requireUser()` + `assertParticipant()` + transaction:
  - `message.create`
  - `conversation.update`
  - `notification.create` (extra write)
- `scheduleChannelDelivery()` — email/push only, **not chat broadcast**.

**No server-side chat broadcast** (contrast with rentals):

- File: `features/realtime/server-live-sync.ts` (lines 14–66)
- Rentals use HTTP POST to `/realtime/v1/api/broadcast`.
- Chat send never calls this.

**Fanout latency:**

- File: `features/chat/hooks/use-chat.ts` (lines 56–71)
- `sendBroadcast`: up to 4 retries × 40ms = 160ms.
- File: `features/chat/hooks/use-chat.ts` (lines 582–588)
- `fanoutMessage`: sequential broadcast to thread channel + peer channel.
- File: `features/chat/hooks/use-chat.ts` (lines 75–99)
- `publishToUserChannel`: ephemeral subscribe, up to 2.5s timeout.

**Fallback = full refetch, not patch:**

- File: `features/chat/hooks/use-chat.ts` (lines 313–321, 453–469)
- `postgres_changes` INSERT on `messages` → `invalidateQueries` → `listChatMessagesAction`.

### Root Cause

Chat latency = **`sendChatTextMessageAction` RTT** + **client-only broadcast** + **sequential fanout**.

Recipient fast path (`applyIncomingMessage`, line 121) works when broadcast arrives. Delay is **before broadcast is sent**.

### Timing Estimate

| Stage | Typical Cost |
|---|---|
| `requireUser` + Prisma transaction + notification | 300–1200ms (PK latency to ap-south-1) |
| `fanoutMessage` subscribe + retries | 50–250ms |
| Broadcast miss → postgres invalidate + refetch | +300–800ms |

**Total peer-visible delay: 350ms–2s+** vs TeamSync’s “few hundred ms.”

### Recommended Fix

| Fix | Location | Expected Improvement |
|---|---|---|
| Server broadcast on message insert (like `wakeUsersLiveSync`) | `chat-actions.ts` after transaction | Peer gets message without waiting for sender tab |
| Parallel fanout (`Promise.all`) | `use-chat.ts:582–588` | ~40–100ms saved |
| Postgres INSERT handler: patch cache from payload, don’t invalidate | `use-chat.ts:313–321, 453–469` | Fallback becomes instant |
| Move notification create to `after()` | `chat-actions.ts:243–261` | Shorter action critical path |

---

## Symptom 3: Rental Handover Requires Manual Refresh

## Symptom 4: Return Confirmation Requires Manual Refresh

These share the same broken sync architecture.

### Evidence Chain

**Verification UI — no dedicated realtime subscription:**

- File: `features/verification/components/verification-panel.tsx` (lines 47–64)
- Query: `queryKeys.verification.status(rentalId, stage)`
- `refetchOnMount: false`, `refetchOnWindowFocus: false` — only invalidation/broadcast can update peer.

**`useRealtimeRentalSync` exists but is NEVER used:**

- Defined: `providers/realtime-sync-provider.tsx` (line 179)
- Not imported anywhere else in codebase.
- Handover/return screens do not listen to `REALTIME_RENTAL_EVENT`.

**After local mutation — peer wake is best-effort:**

- File: `features/verification/components/verification-panel.tsx` (lines 87–91)
  - `await refreshStatus()` — mutator only
  - `afterLiveMutation(queryClient, [status.peerUserId], { rentalId })`
- File: `features/realtime/live-sync.ts` (lines 152–158)
  - `bumpLiveSurfaces()` + `notifyUsersLiveSync()` (client ephemeral channel, 2s timeout)

**Server wake is deferred AND optional:**

- File: `lib/realtime/schedule-live-sync.ts` (lines 9–15)
  - `after(() => wakeUsersLiveSync(...))` — runs after response sent
- File: `features/realtime/server-live-sync.ts` (lines 21–26)
  - If `SUPABASE_SERVICE_ROLE_KEY` missing → silent no-op with warning log

**Critical: `rental_verifications` has NO client postgres backup**

- File: `supabase/sql/004_table_policies.sql` (lines 215–219)
- RLS: only admin can SELECT `rental_verifications` via Supabase JWT.
- File: `providers/realtime-sync-provider.tsx` (lines 73–161)
- No subscription to `rental_verifications` table.

**When PIN/QR verified but rental status already `HANDOVER_PENDING`:**

- File: `features/verification/actions/verification-actions.ts` (lines 598–611)
- Status update to `HANDOVER_PENDING` only when current status is `APPROVED`.
- If already `HANDOVER_PENDING`: **only** `rental_verifications` row changes.
- No `rentals` postgres event → backup on rentals filter does not fire.
- No `rental_confirmations` change → backup on confirmations does not fire.
- **Peer update requires broadcast only.**

**Partial confirm (one party confirms):**

- File: `features/verification/actions/verification-actions.ts` (line 661)
- `rentalConfirmation.update` — postgres backup can work if peer is subscribed.
- Still requires invalidation → `getVerificationStatusAction` refetch (full Server Action).

**Manual refresh button exists:**

- File: `features/verification/components/verification-panel.tsx` (lines 148–156)
- `onClick={() => void refreshStatus()}` — same query as auto-sync, different trigger.

### Why Manual Refresh Works But Auto-Sync Doesn’t

| Action | What Happens |
|---|---|
| Manual “Refresh status” | `statusQuery.refetch()` → `getVerificationStatusAction` → fresh DB state ✅ |
| Auto-sync | Requires broadcast OR postgres event → 160ms debounce → `invalidateQueries` → same refetch |

Manual refresh **bypasses the broken/missed realtime layer**.

### Root Cause (Ranked)

1. **Verify PIN/QR step** — only `rental_verifications` changes; no postgres backup (RLS + no subscription); 100% broadcast-dependent.
2. **`SUPABASE_SERVICE_ROLE_KEY` optional** — server peer-wake silently skipped if missing on Vercel.
3. **Subscriptions start late** — broadcasts during startup window lost with no replay.
4. **`useRealtimeRentalSync` never wired** to `VerificationPanel`.
5. **160ms debounce** on bump (`realtime-sync-provider.tsx:36–51`).

### Recommended Fix

| Fix | Location | Expected Improvement |
|---|---|---|
| Wire `useRealtimeRentalSync(() => refreshStatus(), rentalId)` | `verification-panel.tsx` | Direct refetch on sync event |
| Server `wakeUsersLiveSync` on verify/confirm (not only `after()`) | `verification-actions.ts` | Peer wake even if mutator tab closes |
| Require `SUPABASE_SERVICE_ROLE_KEY` in prod / verify Vercel env | `server-live-sync.ts:23` | Eliminates silent no-op |
| Optimistic peer state for confirm flags | `verification-panel.tsx` | Instant UI; reconcile on refetch |

**Expected:** Handover/return peer updates within 200–400ms without manual refresh.

---

## Symptom 5: Some Realtime Updates Still Require Refresh

### Evidence — Multiple Independent Gaps

**A. Realtime subscriptions gated on delayed `userId`:**

- File: `components/layout/realtime-user-bridge.tsx` (lines 21–27)
  - `userId` starts as `null`
  - `RealtimeSyncProvider userId={userId}` inactive until set
- File: `components/layout/realtime-user-bridge.tsx` (lines 35–37)
  - `RealtimeUserHydrator` sets userId in `useLayoutEffect`
- File: `app/(app)/layout.tsx` (lines 66–86)
  - Hydrator inside Suspense header after `getCurrentProfile()`
- **`{children}` is NOT inside header Suspense** — page mounts while `userId === null`

**B. Seller listings not in default bump surfaces:**

- File: `features/realtime/live-sync.ts` (lines 16–22)
  - `DEFAULT_SURFACES` excludes `sellerListings`
- Listings invalidate only via postgres on `listings` table or local card action.

**C. Return flow — seller depends on bump reaching active query:**

- File: `features/rentals/components/return-item-button.tsx` (lines 55–57)
  - `afterLiveMutation` wakes peer
- File: `features/rentals/components/rental-tabs-panel.tsx` (lines 51–71)
  - `refetchOnMount: false` — depends on invalidation

**D. Duplicate notification channels (redundant, not broken):**

- `useHeaderNotifications` has own postgres channel
- `RealtimeSyncProvider` also listens to notifications

### Root Cause

Missed events during **subscription cold-start window** + **surface-specific invalidation gaps** + **broadcast-only paths** with silent server skip.

### Recommended Fix

| Fix | Location | Expected Improvement |
|---|---|---|
| Pass `userId` from RSC layout synchronously | `app/(app)/layout.tsx` + bridge | Subscriptions active on first client paint |
| Include `sellerListings` in `afterLiveMutation` for listing mutations | listing actions | Cross-tab listing updates |
| Queue/replay missed sync events during startup | new small client module | No lost broadcasts |

---

## Symptom 6: Navigation Occasionally Feels Delayed

### Evidence Chain

**Every protected route pays middleware auth:**

- File: `lib/supabase/middleware.ts` (lines 40–44, 86)
- With auth cookie: every navigation calls `supabase.auth.getUser()`.

**Each protected page re-runs server auth + DB:**

- File: `lib/auth/guards.ts` (lines 40–41)
- `requireUser()` → `getCurrentProfile()` → `getCurrentUser()` + profile DB.

**Layout profile fetches:**

- File: `app/(app)/layout.tsx` (lines 66–68, 101–103)
- `AppAuthHeader` + `AppActivityBanner` both call `getCurrentProfile()` (React `cache()` dedupes per request).

**Realtime bridge adds layout effect hop:**

Profile load → `useLayoutEffect` → `setUserId` → re-render → subscribe channels.

### Root Cause

Navigation latency = **middleware Supabase RTT** + **RSC data fetching** + **delayed realtime subscription mount**.

Not caused by `router.refresh()` — correctly avoided in rental/verification flows:

- `features/verification/actions/verification-actions.ts` (line 41)
- `features/rentals/actions/rental-actions.ts` (line 36)

### Recommended Fix

| Fix | Location | Expected Improvement |
|---|---|---|
| Embed minimal user id in session for instant client subscribe | auth layer | Remove subscription cold-start |
| Narrow middleware auth to session refresh interval | `middleware.ts` | Reduce per-nav Supabase calls |
| Prefetch linked routes on hover | navigation components | Amortize RSC fetch |

---

## Cross-Cutting Findings

### Missing Subscriptions (Confirmed)

| Table / Event | Subscribed? | Client Can Receive? |
|---|---|---|
| `rental_verifications` | **No** | **No** (RLS blocks non-admin SELECT) |
| `rental_confirmations` | Yes (no user filter) | Yes (party RLS) |
| `rentals` | Yes (buyer/seller filter) | Yes |
| Chat `messages` INSERT (global) | Yes | Yes, but handler **invalidates** not patches |

### Missing Optimistic Updates

| Surface | Optimistic? |
|---|---|
| Chat send (sender) | ✅ `patchAppendMessage` |
| Chat receive (recipient) | ❌ depends on broadcast |
| Verification handover/return | ❌ peer waits for refetch |
| Rental status (buyer return) | ✅ `ReturnItemButton` |
| Seller listings | ❌ |

### Stale TanStack Configuration Causing “Stuck UI”

| Query | staleTime | refetchOnMount | Risk |
|---|---|---|---|
| `verification.status` | 15s | false | Must receive invalidation |
| `sellerListings.list` | 60s | false | Same |
| `rentals.buyer/seller` | 30s | false | Same |

Correct **only if realtime is 100% reliable**. It is not.

### Realtime Sync Flow (Verification)

```
Mutator                          Peer
  │                                │
  ├─ confirmStageAction            │
  │    └─ wakeRentalParties         │
  │         ├─ after(wakeUsersLiveSync) ──► live-sync:{userId} broadcast
  │         │    (skipped if no service key)
  │         └─ (server response returns)
  │                                │
  ├─ afterLiveMutation             │
  │    └─ notifyUsersLiveSync ─────► live-sync:{userId} broadcast
  │         (client ephemeral channel)
  │                                │
  │                                ├─ bump() [160ms debounce]
  │                                ├─ invalidateQueries verification.*
  │                                └─ refetch getVerificationStatusAction
  │
  └─ verifyPin (status already HANDOVER_PENDING)
       └─ ONLY rental_verifications changes
            └─ NO postgres backup ──► broadcast ONLY
```

### Duplicate / Unused Mechanisms

- `useRealtimeRentalSync` — defined, never imported.
- `bumpLiveSurfaces` dispatches `samaanx:rental-sync` with `rentalId: null` always (line 91–95).
- `RealtimeSyncProvider.bump` dispatches `REALTIME_RENTAL_EVENT` with actual `rentalId` (line 45–49).

---

## Priority Fix Order (Highest Impact First)

1. **Require + verify `SUPABASE_SERVICE_ROLE_KEY` on Vercel** — unblocks server peer-wake for all rental/verification flows.
2. **Wire `useRealtimeRentalSync` into `VerificationPanel`** — direct refetch on sync events.
3. **Server-side chat broadcast on message insert** — closes TeamSync latency gap.
4. **Fix subscription cold-start** — pass userId synchronously to `RealtimeUserBridge`.
5. **Stream `/seller/listings`** — fixes perceived slowness without blind caching.
6. **Postgres chat fallback: patch not invalidate** — instant fallback when broadcast misses.

---

## What Is NOT the Root Cause

- Blind index additions (`supabase/sql/015_perf_indexes.sql`) — won’t fix missed broadcasts or client waterfalls.
- `router.refresh()` / `revalidatePath()` on rental flows — intentionally removed; manual refresh is `statusQuery.refetch()` or full page reload.
- Business logic — confirm/verify logic is fine; **sync delivery layer** is broken.

---

## Key File Reference

| Area | Primary Files |
|---|---|
| Realtime provider | `providers/realtime-sync-provider.tsx` |
| Live sync client | `features/realtime/live-sync.ts` |
| Live sync server | `features/realtime/server-live-sync.ts`, `lib/realtime/schedule-live-sync.ts` |
| Verification UI | `features/verification/components/verification-panel.tsx` |
| Verification actions | `features/verification/actions/verification-actions.ts` |
| Chat realtime | `features/chat/hooks/use-chat.ts`, `providers/chat-realtime-host.tsx` |
| Chat send action | `features/chat/actions/chat-actions.ts` |
| UserId hydration | `components/layout/realtime-user-bridge.tsx`, `app/(app)/layout.tsx` |
| My Listings | `app/(app)/seller/listings/page.tsx`, `features/listings/components/seller-listings-panel.tsx` |
| Middleware auth | `proxy.ts`, `lib/supabase/middleware.ts` |
| RLS (verification) | `supabase/sql/004_table_policies.sql` |
| Realtime publication | `supabase/sql/009_realtime_publication_expand.sql` |

---

## Environment Checklist (Production)

- [ ] `SUPABASE_SERVICE_ROLE_KEY` set on Vercel (required for `wakeUsersLiveSync`)
- [ ] SQL migrations `006` → `009` applied (realtime publication includes `rental_confirmations`, `messages`, etc.)
- [ ] `DATABASE_URL` points to correct Supabase pooler host
- [ ] `NEXT_PUBLIC_APP_URL=https://samaanx.vercel.app`
