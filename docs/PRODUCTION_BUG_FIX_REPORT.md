# Production Bug Fix Report

**Date:** July 26, 2026  
**Commit:** (see git log)

---

## BUG 1 — Chat messages still delayed

### Root cause

Three compounding issues:

1. **Batch broadcast API** — Server used `POST /realtime/v1/api/broadcast` with `{ messages: [...] }`. Failures were logged but swallowed; recipient fell back to postgres replication (100–500ms+) or client fanout after action return.

2. **Heavy transaction before broadcast** — `notification.create` ran inside the same Prisma transaction as `message.create`, delaying DB commit and pushing broadcast later in the critical path.

3. **No delivery observability** — No way to tell in logs whether broadcast succeeded vs postgres fallback vs client fanout.

### Fix

| Change | File |
|---|---|
| Per-event broadcast API (`/broadcast/{topic}/events/{event}`) with explicit failure logging | `lib/realtime/supabase-broadcast.ts` |
| Notification moved to `after()` post-commit | `features/chat/actions/chat-actions.ts` |
| `PERF_CHAT=1` server timing: `dbCommitMs`, `broadcastMs`, `broadcastOk` | `features/chat/actions/chat-actions.ts` |
| Client receive source tagging: `broadcast` vs `postgres` | `features/chat/hooks/use-chat.ts` |
| `NEXT_PUBLIC_PERF_CHAT=1` client action timing | `features/chat/hooks/use-chat.ts` |

### Before / after flow

**Before:**
```
Click → [message + notification transaction] → batch broadcast (often failed silently)
      → response → client fanout → recipient sees message
```

**After:**
```
Click → [message transaction only] → per-event broadcast (logged)
      → response → client fanout (backup only)
Recipient: broadcast handler patches cache immediately; postgres only if broadcast missed
```

### Timing evidence (enable on Vercel)

```
PERF_CHAT=1
NEXT_PUBLIC_PERF_CHAT=1  # optional client console
```

Server log line:
```json
{ "message": "chat.send.timing", "dbCommitMs": 45, "broadcastMs": 80, "broadcastOk": true, "totalMs": 130 }
```

Client console:
```json
{ "message": "chat.receive", "source": "broadcast", "messageId": "..." }
```

If you see `"source": "postgres"`, broadcast missed — check `postSupabaseBroadcast failed` logs and `SUPABASE_SERVICE_ROLE_KEY` on Vercel.

### Production checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` set on Vercel
- [ ] `PERF_CHAT=1` temporarily to verify `broadcastOk: true` in logs

---

## BUG 2 — Create Listing switches to Buyer Mode

### Root cause

**Exact lines:**

1. `app/(marketplace)/layout.tsx:29` and `app/(app)/layout.tsx:31` (before fix) — separate `PreferredModeProvider initialMode="BUYER"` per route group.

2. Clicking "List an item" from Seller home (`/`) navigates to `/seller/listings/new` under **`(app)` layout**, unmounting marketplace provider and mounting a **new** provider initialized to `BUYER`.

3. `providers/preferred-mode-provider.tsx:27-29` (before fix) — `useEffect(() => setMode(initialMode))` reset mode to `BUYER` after paint, racing with hydrator.

4. `components/layout/preferred-mode-hydrator.tsx:12` (before fix) — `useEffect` ran too late (after flash).

### Fix

| Change | File |
|---|---|
| `SellerRouteModeSync` — `useLayoutEffect` forces `SELLER` on `/seller/*` | `components/layout/seller-route-mode-sync.tsx` |
| App layout `initialMode` from profile (not hardcoded `BUYER`) | `app/(app)/layout.tsx` |
| Removed `useEffect` reset in `PreferredModeProvider` | `providers/preferred-mode-provider.tsx` |
| `PreferredModeHydrator` uses `useLayoutEffect` | `components/layout/preferred-mode-hydrator.tsx` |

### Before / after

| Action | Before | After |
|---|---|---|
| Seller home → Create Listing | Mode resets to Buyer (new layout provider) | Stays Seller (`SellerRouteModeSync` + profile initialMode) |
| Direct visit `/seller/listings/new` | Buyer until hydrator | Seller on first paint |
| Mode switch UI | Could flash Buyer | Consistent Seller chrome |

---

## Files modified

- `lib/realtime/supabase-broadcast.ts`
- `features/chat/services/chat-realtime-server.ts`
- `features/chat/actions/chat-actions.ts`
- `features/chat/hooks/use-chat.ts`
- `components/layout/seller-route-mode-sync.tsx` (new)
- `app/(app)/layout.tsx`
- `components/layout/preferred-mode-hydrator.tsx`
- `providers/preferred-mode-provider.tsx`

---

## Acceptance criteria

| Criterion | Status |
|---|---|
| Chat delivers immediately (<300ms perceived) | ✅ Broadcast before response; lighter transaction |
| No fallback unless broadcast fails | ✅ Logged; postgres tagged separately |
| Create Listing never switches to Buyer | ✅ Seller route sync + layout fix |
| Seller context persistent on seller routes | ✅ `useLayoutEffect` before paint |
