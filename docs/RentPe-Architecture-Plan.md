# SamaanX — Phase 1: Product Foundation & Architecture Plan

**Project:** SamaanX  
**Tagline:** Apki Cheez. Apki Income.  
**Document type:** Architecture plan (frozen)  
**Status:** Frozen — do not change unless a critical issue is discovered  
**Based on:** Software Requirements Specification v2.0 (08 May 2026)  
**Stack override:** SRS tech stack is **ignored**; business requirements are retained  
**Delivery process:** One Phase = One Pull Request (review → fixes → commit → next phase)  

---

## Approved decisions (locked)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Return QR/PIN | **Regenerate when return starts.** Do not reuse the original handover code for multi-day rentals. |
| 2 | Geo / nearest-first | **lat/lng + Haversine** for MVP. Migrate to PostGIS later if needed. |
| 3 | Admin placement | **Same Next.js app** under `/admin`. |
| 4 | MVP auth providers | **Email + Password** and **Google OAuth** only. Microsoft and Apple deferred. |
| 5 | Listing URLs | **SEO-friendly slugs** (e.g. `/listings/canon-eos-1500d-camera-lahore`) with **internal UUID** as primary key. |
| 6 | Routing / mode | **Single app route tree.** Buyer/Seller is a **persisted UI mode preference**, not separate route trees (`/buyer`, `/seller`). |

---

## How to use this document

This is the **frozen** production architecture for rebuilding SamaanX as a mobile-first Progressive Web App. Do not change it unless a critical issue is discovered. Implementation follows the phased roadmap with **One Phase = One Pull Request**.

---

## 1. Product requirements review

### 1.1 What SamaanX is

SamaanX is a **C2C (consumer-to-consumer) peer-to-peer rental marketplace** with a **location-aware architecture** and **Pakistan as the initial launch market**. Users list idle personal items; other users rent them temporarily. Trust is created through ratings, chat, and especially **QR Code + PIN dual verification** at handover and return.

The data model and search design must support future expansion to additional countries **without structural redesign** (e.g. optional `countryCode` alongside city / area / lat / lng).

### 1.2 What the platform DOES

- Connect buyers and sellers for item rentals
- Dual Buyer / Seller mode (InDrive-style toggle)
- Guest mode for browsing without an account
- Nearest-first search with filters and sorting
- Rental request → approve → active → complete lifecycle
- **QR + PIN dual verification** at handover and return
- Real-time in-app chat
- Feedback and rating system
- Admin dashboard for operations

### 1.3 What the platform DOES NOT do

- No payment handling (users use JazzCash / Easypaisa directly)
- No delivery service (users arrange pickup/drop)
- No document / KYC verification
- No legal liability for disputes, fraud, or item condition

### 1.4 Mandatory features (must not be removed)

- Authentication
- Guest Mode
- Buyer Mode
- Seller Mode
- Listings
- Rental Requests
- **QR + PIN Verification** (flagship differentiator)
- Search
- Filters
- Nearby Listings
- Chat
- Reviews
- Wishlist
- Notifications
- Profile
- Admin Dashboard

### 1.5 Verdict

SRS **business workflows, roles, and QR/PIN lifecycle** remain the source of truth.  
SRS **technology stack** (React Native / Expo / Node / Express / MongoDB) is discarded and replaced.

---

## 2. New technology stack (authoritative)

### Frontend

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Lucide React

### Backend

- Next.js Route Handlers
- Server Actions

### Data & platform

- Supabase PostgreSQL
- Prisma ORM
- Supabase Auth
- Supabase Storage
- Supabase Realtime

### Validation & integrations

- React Hook Form + Zod
- Resend (email)
- Google Maps API
- Browser Camera API + html5-qrcode (QR scanning)

### Deployment & app type

- Vercel
- Progressive Web App (PWA)
- Mobile-first, responsive desktop

---

## 3. Recommended software architecture

### 3.1 Pattern

**Feature-sliced Clean Architecture on Next.js App Router**

```
┌─────────────────────────────────────────────┐
│  Presentation (RSC + selective Client)      │
│  app/ · features/*/components · ui/         │
├─────────────────────────────────────────────┤
│  Application (use-cases)                    │
│  Server Actions · Route Handlers · policies │
├─────────────────────────────────────────────┤
│  Domain (pure TypeScript)                   │
│  rental lifecycle · QR/PIN · search rules   │
├─────────────────────────────────────────────┤
│  Infrastructure                             │
│  Prisma · Supabase Auth/Storage/Realtime    │
│  Resend · Google Maps · rate limits         │
└─────────────────────────────────────────────┘
```

### 3.2 Principles

| Principle | Application |
|-----------|-------------|
| Dependency rule | UI → actions → domain → infra; domain never imports Next/React |
| Server-first | React Server Components by default; `"use client"` only for forms, maps, QR, chat, toggles |
| Single app, multi-surface | Public marketplace + `/admin` in one Next.js app (shared auth/DB) |
| Contracts | Zod schemas are the single validation source for forms, actions, and APIs |
| Modularity | Feature modules; no mega-components; no duplicated business logic |

### 3.3 Why not a separate Express API?

Route Handlers + Server Actions are correct for MVP → early scale **if** domain logic is extracted into pure services (not stuck inside route files). Split a dedicated API later only if non-web clients or heavy background workers require it.

---

## 4. Complete folder structure

```
rentpe/
├── app/                          # Next.js App Router (routes only)
│   ├── (marketing)/              # landing, legal, about
│   ├── (auth)/                   # login, signup, oauth callbacks
│   ├── (app)/                    # single app shell (guest + authenticated)
│   │   ├── search/
│   │   ├── listings/[slug]/      # SEO slug; resolve via UUID internally
│   │   ├── rentals/
│   │   ├── chat/
│   │   ├── wishlist/
│   │   ├── profile/
│   │   └── seller/               # seller tools as pages inside same shell (not a mode tree)
│   │       └── listings/
│   ├── (admin)/admin/            # admin dashboard (same deployment)
│   ├── api/                      # Route Handlers (webhooks, JSON endpoints)
│   ├── layout.tsx
│   ├── manifest.ts               # PWA
│   └── globals.css
├── features/                     # Feature modules (primary code home)
│   ├── auth/
│   ├── listings/
│   ├── search/
│   ├── rentals/
│   ├── verification/             # QR + PIN (flagship module)
│   ├── chat/
│   ├── reviews/
│   ├── wishlist/
│   ├── notifications/
│   ├── profile/
│   ├── admin/
│   └── guest/
├── components/                   # Shared UI only (not feature-specific)
│   └── ui/                       # shadcn primitives
├── lib/
│   ├── db/                       # Prisma client singleton
│   ├── supabase/                 # browser + server + middleware clients
│   ├── email/                    # Resend templates
│   ├── maps/                     # Google Maps helpers
│   ├── auth/                     # session helpers, guards
│   └── utils/
├── domain/                       # Pure business rules (framework-free)
│   ├── rental/
│   ├── verification/
│   └── search/
├── schemas/                      # Zod (or colocated under features/*/schemas)
├── types/
├── hooks/                        # Shared client hooks only
├── providers/                    # Theme, query, realtime, mode
├── config/                       # env, constants, categories, cities
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   ├── icons/
│   └── PWA / service worker assets
├── tests/
├── e2e/
└── docs/                         # ADRs and architecture docs
```

**Rule:** `app/` = routing + composition only. Business logic lives in `features/` + `domain/`.

---

## 5. Feature-based module structure

Each feature follows the same internal shape:

```
features/<feature>/
├── components/          # small, focused UI
├── actions/             # Server Actions
├── api/                 # Route Handlers (if needed)
├── schemas/             # Zod
├── services/            # application orchestration
├── queries/             # read models (Prisma queries)
├── types/
├── hooks/               # client-only
└── index.ts             # public exports only
```

### Module ownership

| Module | Owns |
|--------|------|
| `auth` | Signup/login/OAuth/session/guest gate |
| `listings` | CRUD, photos (1–10), availability calendar, seller inventory |
| `search` | Filters, sort, nearest-first, geo queries |
| `rentals` | Request/approve/reject/cancel + status machine |
| `verification` | QR payload, PIN hash, attempts, lock, confirmations |
| `chat` | Threads tied to rental, realtime messages |
| `reviews` | Post-completion ratings |
| `wishlist` | Save listings |
| `notifications` | In-app + email (push/SMS later) |
| `profile` | Settings, mode preference, trust metrics |
| `admin` | Users, listings, disputes, categories, analytics |
| `guest` | Browse-only capability matrix |

**Important:** Verification is its **own module**, not buried inside rentals UI. The same domain service powers handover and return screens.

---

## 6. Project conventions

- TypeScript **strict** mode; enable `noUncheckedIndexedAccess`; ban `any`
- Prefer **Server Components**; mark client boundaries at leaf components
- One concern per file; keep components small (~150 lines guideline); extract early
- Business rules in `domain/`; never duplicate in UI
- All mutations go through **Server Actions** (or Route Handlers for webhooks / external clients)
- Zod validation at every boundary (form → action → DB write)
- Typed errors with user-safe messages (`AppError` / `Result` pattern)
- Feature flags via config/env for phased rollout
- Architecture Decision Records (ADRs) in `docs/adr/` for major decisions
- Conventional Commits; PRs prefer vertical slices
- ESLint + Prettier + CI typecheck/lint

---

## 7. Naming conventions

| Kind | Convention | Example |
|------|------------|---------|
| Component files | PascalCase | `RentalStatusBadge.tsx` |
| Utils / hooks | camelCase / `useX` | `useBuyerMode.ts` |
| Server Actions | verbNounAction | `approveRentalAction` |
| Route Handlers | REST nouns | `/api/rentals/[id]/verify-handover` |
| Zod schemas | entitySchema | `createListingSchema` |
| DB tables | snake_case plural | `rental_verifications` |
| Prisma models | PascalCase singular | `RentalVerification` |
| Enums | Prisma enums / clear status names | `RentalStatus.ACTIVE` |
| CSS variables | `--rp-*` | `--rp-accent` |
| Env vars | standard + app prefix | `NEXT_PUBLIC_SUPABASE_URL` |
| Cross-feature imports | via feature `index.ts` only | no deep internal imports |

---

## 8. Scalable database strategy

### 8.1 Source of truth

**PostgreSQL (Supabase) + Prisma ORM**

### 8.2 Core entities (logical model — not implemented yet)

- `users` / `profiles` (linked to Supabase Auth `auth.users`) — includes trust metrics fields (see §8.10)
- `categories` (database-driven; admin-manageable; see §8.9)
- `listings` + `listing_images` + listing availability calendar (see §8.11)
- `rentals` (status machine)
- `rental_verifications` (QR payload hash, PIN hash, attempts, lock, expiry)
- `rental_confirmations` (handover/return per party + timestamps)
- `conversations` + `messages`
- `reviews`
- `wishlists`
- `notifications` (channel-ready; see §8.12)
- `reports` / `disputes` (admin)
- `audit_logs` (security-sensitive events)

### 8.3 Recommended rental status machine

| Status | Trigger | Next |
|--------|---------|------|
| `REQUESTED` | Buyer sends request | Seller approve / reject |
| `APPROVED` | Seller approves | QR + PIN generated |
| `HANDOVER_PENDING` | Verify QR/PIN | Both parties confirm |
| `ACTIVE` | Both confirm handover | Rental in progress |
| `RETURN_PENDING` | Verify QR/PIN | Both parties confirm |
| `COMPLETED` | Both confirm return | Feedback unlocked |
| `CANCELLED` / `EXPIRED` / `DISPUTED` | Timeouts / admin / parties | Terminal |

### 8.4 Indexes & geo

- B-tree indexes: status, FKs, `created_at`, `categoryId`, city, `countryCode`, `slug` (unique)
- **Geo (MVP — approved):** store `lat` / `lng`; nearest-first via **Haversine** distance (bounding-box prefilter recommended)
- **Geo (later):** optional PostGIS `geography` + GiST if scale requires it
- **Multi-region readiness:** store `countryCode` (ISO-style) on listings/profiles as needed; MVP may default to `PK` without UI for other countries
- Optional later: Postgres full-text (`tsvector`) on title/description
- Listings use **UUID primary key** + unique **SEO slug** for public URLs

### 8.5 Data rules

- Soft-delete listings where appropriate
- Enforce rental transitions in **domain logic** (+ DB enums/checks)
- PIN: store **hash only** (bcrypt/argon2); never plaintext
- QR: store **signed payload + hash**, not a CDN image URL
- Render QR on demand from payload (client or server)
- Keep verification as a **separate table/row** so codes can regenerate without rewriting rental history
- Supabase Storage RLS; Prisma with service role **server-only**

### 8.6 Scaling path

1. Single Postgres + pooler (Supabase pooler / Prisma Accelerate)
2. Read replicas / materialized views for admin analytics
3. Partition `messages` / `notifications` by time if volume grows
4. Use Supabase Realtime for chat early

### 8.7 QR + PIN rules (from SRS — retain)

- On approval: generate unique QR payload + 6-digit PIN
- Both parties can use QR **or** PIN at handover and return
- Both parties must confirm handover → `ACTIVE`
- Both parties must confirm return → `COMPLETED`
- Max 5 failed PIN attempts → lock for 15 minutes
- Reject wrong-user / tampered / expired codes
- Replay protection via timestamp + HMAC/hash

### 8.8 QR/PIN lifecycle (approved)

SRS said QR/PIN valid for **1 hour** and reused for the full lifecycle. That is **rejected** for multi-day rentals.

**Approved rules:**

- **Handover codes:** generated on approval; short validity window (e.g. 1 hour); regenerable if expired unused
- **Return codes:** **regenerated when the return process starts** — never reuse the original handover QR/PIN
- Same dual QR **or** PIN UX for both handover and return
- Verification requires **online** server validation
- Offline support = **display** cached QR/PIN only (not offline verify)

### 8.9 Categories (database-driven)

Do **not** hardcode categories in application code as the source of truth.

Recommend a `categories` table:

| Field | Notes |
|-------|-------|
| `id` | UUID primary key |
| `name` | Display name |
| `slug` | Unique SEO-friendly slug |
| `icon` | Icon key / asset reference |
| `sortOrder` | Admin-controlled ordering |
| `isActive` | Soft-deactivate; do not hard-delete if listings reference the category |
| `createdAt` | Timestamp |
| `updatedAt` | Timestamp |

- Admin can manage categories in future versions (`/admin`)
- MVP may seed predefined active records (e.g. the original nine SRS categories)

### 8.10 User trust profile (metrics — not authentication)

Expand `profiles` with trust indicators for marketplace confidence. These are **not** identity/auth mechanisms.

| Metric | Notes |
|--------|-------|
| Average Rating | From completed reviews |
| Completed Rentals | Count of `COMPLETED` rentals as buyer and/or seller |
| Response Time | Derived metric (e.g. time to first reply / approve) |
| Cancellation Rate | Derived from cancelled rentals vs started |
| Member Since | Profile `createdAt` |
| Verification Status | **Future** badge only (not KYC in MVP scope) |

### 8.11 Listing availability model

Prefer a calendar-oriented model over a single open-ended date range alone.

Architecture should support:

| Concept | Source / notes |
|---------|----------------|
| **Available Dates** | Seller-defined availability windows |
| **Blocked Dates** | Seller-blocked (maintenance, personal use) |
| **Booked Dates** | **Derived** from approved/active rentals — not free-hand edits that can desync from the rental state machine |
| **Recurring Availability** | **Future** (e.g. weekends only) |

Overlap prevention: reject approve/request when requested dates intersect booked or blocked dates for the same listing.

### 8.12 Notification architecture

Notifications are multi-channel ready:

| Channel | Priority |
|---------|----------|
| In-App Notifications | **MVP required** |
| Email Notifications (Resend) | **MVP required** |
| Web Push Notifications | Future |
| SMS Notifications | Future |

Use a single notification domain/outbox so new channels can be added without redesigning consumers.

### 8.13 Security deposit model

Support deposit strategy on listings (and rentals snapshot):

| Type | Notes |
|------|-------|
| `NONE` | No deposit |
| `FIXED` | Fixed amount (currency units) |
| `PERCENTAGE` | **Future-ready** — percent of rental total; schema-ready, not required in MVP UI |

**MVP implementation:** `NONE` + `FIXED` only. Architecture must not paint into a corner that blocks `PERCENTAGE` later.

---

## 9. Authentication strategy

| Method | Priority | Notes |
|--------|----------|-------|
| Email + password | **MVP** | Supabase Auth; min length **8+** (SRS said 6 — too weak) |
| Google OAuth | **MVP** | Supabase provider |
| Microsoft OAuth | Later | Deferred — not in MVP |
| Apple Sign-in | Later | Deferred — weak fit for web PWA; revisit if native wrappers appear |
| Guest Mode | **MVP** | Allow browse/search/detail; block request/chat/verify |

### Session

- Supabase SSR cookies via Next.js middleware
- Align long-lived session (SRS: 30 days) with Supabase JWT + refresh settings

### Authorization

- Role on profile: `USER` | `ADMIN`
- Buyer/Seller is a **mode preference**, not separate accounts
- Server-side guards on every mutation (`requireUser`, `requireAdmin`, `assertRentalParty`)
- Guest capability matrix enforced in domain, not only by hiding UI

### Profile sync

- Upsert `profiles` on first login / auth webhook

---

## 10. Deployment strategy

| Concern | Choice |
|---------|--------|
| Hosting | Vercel (App Router; Edge Middleware where useful) |
| DB / Auth / Storage / Realtime | Supabase (prod + staging projects) |
| Env / secrets | Vercel env vars; never commit secrets |
| Branches | `main` → prod; `staging` → staging DB; PRs → Vercel Preview |
| Migrations | Prisma migrate in CI against staging; gated production migrate |
| Observability | Vercel Analytics + Sentry + Supabase logs |
| Backups | Supabase PITR before public launch |
| Admin | Same app at `/admin` with role gate (split later only if needed) |

---

## 11. UI architecture

### 11.1 Product quality bar

UI should feel comparable to Airbnb / Facebook Marketplace / OLX / InDrive: modern, premium, clean, highly polished — **not** a student project aesthetic.

### 11.1.1 SamaanX Design Language

The application follows this design philosophy:

- Mobile-first
- Premium
- Minimal
- Friendly
- Native app feel
- Rounded UI
- Large touch targets
- Smooth animations
- Accessibility-first
- Consistent spacing
- Large product images
- Clean typography

These principles guide tokens, components, and motion. They do not change the technology stack.

### 11.2 Mobile-first PWA shell

- Design every screen for mobile first; desktop is responsive enhancement
- Bottom navigation: 5 tabs, content switches by Buyer/Seller mode
- Mode toggle on Home + Profile (persisted preference)
- Design system: shadcn/ui + SamaanX design tokens (color, type, spacing, motion)
- Framer Motion: 2–3 purposeful motions (page transition, mode switch, verification success)
- Lucide icons with consistent weight
- `next/image` + Supabase URLs for listing media (see §15.1 image optimization)
- Dark / light mode retained from SRS (`next-themes`)

### 11.3 Bottom navigation (from SRS)

**Buyer:** Home · Search · My Rentals · Chat · Profile  
**Seller:** Home · My Listings · My Rentals · Chat · Profile

### 11.4 Screen → route map

| SRS screen | Suggested route |
|------------|-----------------|
| Splash / Onboarding | `/` first-run + `/onboarding` |
| Login / Signup | `/login`, `/signup` |
| Home | app home `/` |
| Search | `/search` |
| Product detail | `/listings/[slug]` (UUID resolved internally) |
| Rental request | `/listings/[slug]/request` |
| Seller listings tools | `/seller/listings`, `/seller/listings/new`, etc. (pages in **same** app shell; mode is UI preference, not route tree) |
| Add / Edit product | `/seller/listings/new`, `/seller/listings/[id]/edit` |
| My rentals | `/rentals` |
| Chat list / thread | `/chat`, `/chat/[id]` |
| Handover / return verify | `/rentals/[id]/verify` |
| Feedback | `/rentals/[id]/review` |
| Profile | `/profile` |
| Wishlist | `/wishlist` |
| Admin | `/admin/*` (same Next.js app) |

**Mode note (approved):** Buyer/Seller toggle changes bottom-nav labels, home content, and CTAs. It does **not** create parallel `/buyer/*` and `/seller/*` trees.

### 11.5 Homepage strategy

Home should feel like a modern marketplace feed, not a flat dump of listings. Recommended sections:

| Section | Priority |
|---------|----------|
| Nearby Listings | MVP (geo + Haversine) |
| Recently Added | MVP |
| Popular Listings | MVP (simple popularity signal; refine later) |
| Top Rated | MVP |
| Categories | MVP (from `categories` table) |
| Recommended For You | Future (personalization) |

Buyer vs Seller mode may change primary CTAs and the first section emphasis, within the **same** home route.

### 11.6 Listing fields (updated)

- Title (max 100)
- Category (FK to `categories` — not hardcoded)
- Description (max 500)
- Photos: **minimum 1**, **maximum 10**; max **5 MB** each
- Rent price (day / week / month)
- Security deposit: `NONE` | `FIXED` | `PERCENTAGE` (MVP UI: `NONE` + `FIXED`)
- Location (city + area + `lat` / `lng`; `countryCode` for multi-region readiness)
- Availability via available / blocked dates; booked dates derived from rentals

### 11.7 Search & sorting

**Nearest-first priorities:** same area → same city within 5/10/20 km → other cities by distance (respect `countryCode` when multi-country data exists)

**Filters:** category, city, price range, availability dates  

**Sort (MVP — keep):**

- Nearest
- Price low → high / high → low
- Newest
- Highest rated

**Sort (future — additive):**

- Most viewed
- Most requested
- Recently available

### 11.8 Admin dashboard analytics (future recommendations)

Admin remains in the same Next.js app under `/admin`. Future analytics (not MVP requirements):

- Active Users
- Total Listings
- Active Rentals
- Category Distribution
- City Distribution
- User Growth
- Reported Listings
- Platform Activity

---

## 12. State management strategy

| State type | Approach |
|------------|----------|
| Server / cached data | React `cache()` + Prisma in RSC; optional TanStack Query for client refetch |
| Auth session | Supabase client + server session |
| Buyer / Seller mode | Small client store (Zustand or context) + persisted preference |
| Forms | React Hook Form + Zod |
| Chat realtime | Supabase Realtime subscription |
| Notification badge | Realtime + light client store |
| UI ephemeral | Local `useState` |
| Filters / sort | URL `searchParams` (shareable + SEO-friendly) |

**Avoid Redux.** Keep global client state minimal.

---

## 13. API architecture

### 13.1 Hybrid model

1. **Server Actions** — primary for form mutations (listings, approve, confirm, reviews)
2. **Route Handlers** — JSON verify endpoints if needed by scanner flows; webhooks; health
3. **RSC queries** — reads in server components / `queries/`

### 13.2 Verification API surface (preserve SRS intent)

| Operation | Suggested surface |
|-----------|-------------------|
| Generate / regenerate QR + PIN | Server Action on approve + expiry regeneration |
| Verify handover | Action or `POST /api/rentals/[id]/verify-handover` |
| Confirm handover | Idempotent Server Action (both parties) |
| Verify return | Same pattern as handover |
| Confirm return | Action → `COMPLETED` |
| Get QR payload | Authenticated GET for rental parties only |

### 13.3 Additional endpoints (expand beyond SRS)

SRS listed a partial API. Architecture should also cover:

- Auth session helpers (via Supabase, not custom JWT invent)
- Listings CRUD + image upload flows
- Search with filters/sort/geo
- Wishlist CRUD
- Notifications read/mark
- Reviews create/list
- Chat list/send (plus Realtime)
- Admin moderation endpoints/actions
- Report / dispute create

### 13.4 Contract rules

- Zod for request/response validation
- Consistent error envelope for Route Handlers
- Idempotent confirm endpoints
- Atomic increment of PIN attempts inside a DB transaction

---

## 14. Security best practices

- HTTPS only; secure cookies; CSRF protections via Next Server Action origin checks
- PIN hashing (argon2id or bcrypt); constant-time compare
- QR payload format concept: `RENTPE|{rentalId}|{timestamp}|{HMAC}` — reject expired/tampered/replayed
- Rate limit verification endpoints (IP + user + rental)
- Prefer lock after 5 failures **per rental verification context**, not whole account
- Only buyer/seller of a rental may verify/confirm
- Supabase Storage: private buckets + signed URLs; MIME + 5 MB validation
- Prisma / service role never exposed to the browser
- Admin routes: role check + audit log
- Sanitize chat content; rate-limit messages
- Security headers (CSP, HSTS) on Vercel
- Minimize `NEXT_PUBLIC_*` surface
- Show legal disclaimer at signup and rental request

---

## 15. Performance optimization strategy

- RSC + streaming for feed/search shells
- Virtualize long search result lists (client island)
- DB indexes matching filter + sort; geo bounding box before distance sort
- QR generation &lt; 500ms target: generate locally from payload (no image CDN upload)
- PIN verify &lt; 200ms target: single indexed transactional compare
- Cache public listing pages with revalidation on update
- PWA: cache app shell + static assets; network-first for API data
- Dynamic import maps, QR scanner, admin charts
- Prisma connection pooling for serverless

### 15.1 Image optimization

Listing and profile media should follow:

- Automatic compression on upload (server-side pipeline)
- Responsive images (`next/image` sizes / srcset)
- Modern formats (WebP / AVIF where supported)
- Lazy loading for below-the-fold media
- Blur placeholders for perceived performance

Upload validation remains **max 5 MB per image**; store originals or derived variants in Supabase Storage as appropriate.

### Non-functional targets (from SRS)

| Metric | Target |
|--------|--------|
| QR generation | &lt; 500 ms |
| PIN verification | &lt; 200 ms |
| Cold start | &lt; 3 s |
| API p95 | &lt; 500 ms |
| Initial concurrent users | 500+ |
| Uptime | 99.5% |
| Image max | 5 MB / photo (min 1, max 10 per listing) |
| Platforms | modern mobile browsers + PWA install |

---

## 16. SEO strategy

- Public listing, category, and city pages as RSC with Next.js Metadata API
- `generateMetadata` per listing (title, price, city, OG image)
- `sitemap.xml` + `robots.txt`
- JSON-LD for product/offer where accurate
- Canonical URLs using **SEO slugs**; internal UUID remains the primary identifier
- `noindex` on private app routes (`/rentals`, `/chat`, `/admin`)
- Strong marketing landing for initial Pakistan launch intent (location-aware; expandable to other markets)
- Performance (LCP) treated as SEO work

---

## 17. Accessibility strategy

- Target WCAG 2.2 AA
- Semantic HTML, skip links, visible focus states
- Bottom nav: `aria-current`; mode toggle announced to AT
- Forms: labels + errors via `aria-describedby`
- PIN path is an equal alternative to QR (a11y + elderly-friendly)
- Camera permission UX with clear text fallback
- Do not convey rental status by color alone
- Respect `prefers-reduced-motion`
- Full keyboard path for all non-camera flows

---

## 18. Future scalability strategy

| Stage | Approx users | Moves |
|-------|--------------|-------|
| MVP | &lt; 1k | Single Vercel + Supabase |
| Growth | 1k–20k | Pooling, image CDN patterns, Realtime chat, email queue |
| Scale | 20k+ | Read replicas, PostGIS, background workers (e.g. Inngest), optional split API |
| Later (out of current scope) | — | Native shells, escrow/payments, delivery partners |

Design seams now: pure domain services, regenerable verification codes, notification outbox table.

---

## 19. SRS weaknesses & missing requirements

| # | Issue | Severity |
|---|--------|----------|
| 1 | QR/PIN “1 hour validity” conflicts with multi-day rentals / return step | **Critical** |
| 2 | “Works offline” for verification contradicts server-side validation | **Critical** |
| 3 | Wishlist & Notifications mandatory in product brief but missing from SRS schema/API | High |
| 4 | Dispute/report workflow underspecified | High |
| 5 | City + area free text insufficient for true nearest-first without lat/lng | High |
| 6 | DB schema incomplete (users, listings, chat, reviews lightly specified) | High |
| 7 | Availability overlap / double-booking rules unspecified | High |
| 8 | API list incomplete (admin, wishlist, notifications, search params) | Medium |
| 9 | Apple Sign-in “iOS only” vs web PWA | Medium |
| 10 | “Account locked” on PIN failures may be too broad | Medium |
| 11 | Password minimum 6 characters too weak | Medium |
| 12 | No abuse / spam / rate-limit policy | Medium |
| 13 | Push notification channel strategy unclear (web push vs email-only) | Medium |
| 14 | Cloudinary QR image storage unnecessary with modern QR rendering | Low |
| 15 | SRS “Feature Completion = Done” is aspirational, not actual rebuild status | Low |

---

## 20. Suggested improvements (core business idea unchanged)

1. **Split verification windows (approved):** short-lived handover codes; **regenerate return codes when return starts** — never reuse handover codes.
2. **Online-only verification;** offline = display cached QR/PIN only.
3. **Lat/lng + Haversine (approved)** for MVP nearest-first; map picker on listing create; city/area as labels; `countryCode` for multi-region readiness. PostGIS later if needed.
4. **Expanded status enum** including `HANDOVER_PENDING`, `RETURN_PENDING`, `DISPUTED`, etc.
5. **Overlap prevention:** block approve if dates conflict with booked (derived) or blocked dates for the same listing.
6. Add **wishlist** and **notifications** (in-app + email MVP; push/SMS later) to v1 schema and modules.
7. **Trust profile metrics:** average rating, completed rentals, response time, cancellation rate, member since; verification status future-only.
8. **Admin tools** in same app under `/admin`: reports, force-cancel, soft-ban, listing takedown, verification audit trail; analytics recommended for later.
9. **Password policy:** 8+ characters minimum.
10. **SEO slugs (approved)** for listings; UUID internally.
11. **Resend emails:** request received, approved, code regenerated, review reminder.
12. **PIN lock scoped to rental verification**, not entire user account.
13. **Render QR from signed payload** — drop Cloudinary dependency for QR images.
14. **Guest funnel:** browse → intent → signup gate at rental request.
15. Basic **content moderation** hooks before scale.
16. **MVP auth (approved):** Email + Password + Google only.
17. **Single route tree (approved):** Buyer/Seller is persisted UI mode, not separate route trees.
18. **Dynamic categories** table (seeded for MVP; admin-managed later).
19. **Listing photos:** min 1, max 10, 5 MB each.
20. **Deposit model:** `NONE` | `FIXED` | `PERCENTAGE` (MVP: `NONE` + `FIXED`).
21. **Homepage sections:** nearby, recently added, popular, top rated, categories; recommended-for-you later.
22. **Additional sorts (future):** most viewed, most requested, recently available.

---

## 21. Implementation roadmap

| Phase | Name | Deliverables | Exit criteria |
|-------|------|--------------|---------------|
| **0** | Foundation | Next 15 + TS scaffold, Tailwind, shadcn, Prisma, Supabase clients, CI, env, design tokens, PWA manifest stub | Preview deploy on Vercel |
| **1** | Auth & identity | Email/password, Google, guest, profile, middleware guards, mode preference | Guest browse + authenticated users |
| **2** | Listings | Create/edit/list, image uploads (3–8), categories, availability | Seller can publish |
| **3** | Search & discovery | Filters, sort, nearest-first (geo), listing detail SEO | Mobile search usable |
| **4** | Rentals | Request/approve/reject, status machine, My Rentals | End-to-end request flow |
| **5** | **QR + PIN verification** | Generate, scan, PIN entry, mutual confirm handover/return, locks, regen | Flagship lifecycle complete |
| **6** | Chat & notifications | Realtime chat per rental, in-app + Resend | Parties can coordinate |
| **7** | Trust | Reviews after `COMPLETED`, wishlist, profile trust stats | Social proof loop |
| **8** | Admin | Users/listings/rentals/disputes/analytics | Ops can moderate |
| **9** | PWA & polish | Installability, offline shell, motion, a11y, dark mode | PWA + a11y bar met |
| **10** | Launch hardening | Rate limits, Sentry, backups, legal pages, load considerations | Production go-live |

**Phase 5 (QR + PIN) is non-negotiable** and must not be deferred behind cosmetic polish.

---

## 22. Open decisions — resolved

All pre-Phase-0 decisions are **approved** (see table at top of this document).

| Decision | Approved resolution |
|----------|---------------------|
| Return QR/PIN | Regenerate when return starts; do not reuse handover codes |
| Geo | lat/lng + Haversine for MVP; PostGIS later if needed |
| Admin | Same Next.js app under `/admin` |
| OAuth MVP | Email + Password + Google only |
| Listing URLs | SEO slugs + internal UUID |
| Routing / mode | Single app route tree; mode is persisted UI preference |

---

## 23. Explicit non-goals for this phase

- No application code yet
- No project initialization yet
- No package installation yet
- No components / Prisma models yet
- No payments, delivery, or KYC features

---

## 24. Consultation questions for external review

Use these prompts when reviewing this plan with another advisor/model:

1. Does feature-sliced Clean Architecture on Next.js App Router fit a Pakistan-first PWA marketplace MVP that may grow to tens of thousands of users?
2. Are Server Actions + Route Handlers sufficient until scale, or should a separate API service exist from day one?
3. Is the proposed QR/PIN regeneration model (handover window vs return regeneration) more secure and practical than the SRS “1 hour for full lifecycle” rule?
4. For nearest-first search in Pakistani cities, is PostGIS required at MVP or is lat/lng + Haversine enough?
5. Any major security gaps in PIN hashing, QR HMAC, rate limits, and mutual confirmation?
6. What would you change in the 11-phase roadmap to reach a credible public MVP faster without cutting QR/PIN?
7. Are Wishlist + Notifications correctly prioritized inside the roadmap relative to Chat and Admin?
8. Given no in-app payments, what trust/safety features are still missing for a real consumer product launch in Pakistan?

---

## Document control

| Field | Value |
|-------|-------|
| Product | SamaanX |
| Version | Architecture Plan 1.2 (frozen) |
| Inputs | SRS v2.0 (May 2026) + stakeholder stack mandate + approved decisions + minor revision patches |
| Output | Frozen architecture |
| Process | One Phase = One Pull Request |
| Next | Phase 0 — Project Scaffold & Foundation (awaiting dedicated Phase 0 prompt) |

---

**Legal note (from SRS, retained):**  
SamaanX is a connecting platform only. It does not handle payments, delivery, or document verification. SamaanX is not responsible for fraud, loss, or disputes. QR/PIN verification confirms handover/return events — not item condition or authenticity.
