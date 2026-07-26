# SamaanX — Phase 1A: Database & Domain Design

**Status:** Frozen  
**Architecture:** v1.2 (frozen)  
**Scope:** Logical design only — **no Prisma models, migrations, APIs, UI, or business logic**  
**Next:** Phase 1B only after this freeze (separate prompt)

---

## Approved decisions (locked)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Conversation creation | Created when rental enters **`REQUESTED`**. If rejected/cancelled, conversation remains **read-only** for history. |
| 2 | Verification regen | **Append-only.** Every regeneration inserts a new row; prior rows keep `is_current = false`. |
| 3 | Highest Rated sort (MVP) | Uses **seller** `profiles.avg_rating`. Listing-level ratings may come later. |
| 4 | Listing images 1–10 | Enforced at **application layer** in MVP. DB-level enforcement deferred. |
| 5 | Reports / disputes | **Single `reports` table** for MVP. Disputes = a report type; may become a dedicated module later. |
| 6 | Guests | **No `profiles` row.** Public browse only; all rental actions require authentication. |

### Additional locked recommendations

- Notifications include both `read_at` and `delivered_at` timestamps.
- Audit logs include optional `ip` and `user_agent` fields.
- Wishlist / favorite **counts are not denormalized** on listings (or elsewhere) in the MVP.

---

## 1. Entity list

| # | Entity (table) | Purpose |
|---|----------------|---------|
| 1 | `profiles` | App user record linked 1:1 to Supabase `auth.users` |
| 2 | `categories` | Admin-managed listing categories |
| 3 | `listings` | Rentable items published by sellers |
| 4 | `listing_images` | Photos for a listing (1–10) |
| 5 | `listing_availability` | Seller-defined available/blocked date ranges |
| 6 | `rentals` | Rental requests and lifecycle state machine |
| 7 | `rental_verifications` | QR payload + PIN hash per verification stage |
| 8 | `rental_confirmations` | Mutual party confirmations per stage |
| 9 | `conversations` | Chat thread bound to a rental |
| 10 | `messages` | Chat messages within a conversation |
| 11 | `reviews` | Post-completion ratings/reviews |
| 12 | `wishlists` | Saved listings per user |
| 13 | `notifications` | Multi-channel notification records |
| 14 | `reports` | User reports and dispute intake for admin (single table; dispute = report type) |
| 15 | `audit_logs` | Security and lifecycle audit trail |

**Note on “Users”:** Supabase Auth owns identity (`auth.users`). SamaanX’s public schema uses `profiles` as the single app-facing user entity (`id` = `auth.users.id`). No duplicate password/credential store.

---

## 2. Relationship diagram (text)

```
auth.users (Supabase Auth)
    │ 1:1
    ▼
profiles
    │
    ├── 1:N ──► listings (seller)
    ├── 1:N ──► rentals as buyer
    ├── 1:N ──► rentals as seller
    ├── 1:N ──► messages
    ├── 1:N ──► reviews (as reviewer / as reviewee)
    ├── 1:N ──► wishlists
    ├── 1:N ──► notifications
    ├── 1:N ──► reports (as reporter)
    └── 1:N ──► audit_logs (as actor, nullable)

categories
    │ 1:N
    ▼
listings
    │
    ├── 1:N ──► listing_images
    ├── 1:N ──► listing_availability
    ├── 1:N ──► rentals
    └── N:M ──► profiles via wishlists

rentals
    │
    ├── 1:N ──► rental_verifications   (append-only; current row per stage via is_current)
    ├── 1:N ──► rental_confirmations   (one row per stage)
    ├── 1:1 ──► conversations          (created at REQUESTED; read-only if terminal inactive)
    └── 1:N ──► reviews                (up to 2: buyer→seller, seller→buyer)

conversations
    │ 1:N
    ▼
messages
```

### Relationship types & why

| Relationship | Type | Why |
|--------------|------|-----|
| `auth.users` ↔ `profiles` | 1:1 | Auth identity vs app profile/trust/mode |
| `profiles` → `listings` | 1:N | One seller owns many listings |
| `categories` → `listings` | 1:N | Category taxonomy; soft-deactivate categories |
| `listings` → `listing_images` | 1:N | Ordered gallery (1–10) |
| `listings` → `listing_availability` | 1:N | Multiple available/blocked windows |
| `listings` → `rentals` | 1:N | Many rental attempts over time |
| `profiles` → `rentals` (buyer) | 1:N | Buyer history |
| `profiles` → `rentals` (seller) | 1:N | Seller history |
| `rentals` → `rental_verifications` | 1:N | Separate HANDOVER vs RETURN codes (approved regen rule) |
| `rentals` → `rental_confirmations` | 1:N | Mutual confirm per stage |
| `rentals` ↔ `conversations` | 1:1 | One chat thread per rental; created at `REQUESTED` |
| `conversations` → `messages` | 1:N | Message history (read-only thread if rental rejected/cancelled) |
| `profiles` ↔ `listings` via `wishlists` | N:M | Saved items (no denormalized favorite counts in MVP) |
| `rentals` → `reviews` | 1:N | Bilateral post-completion feedback |
| `profiles` → `notifications` | 1:N | Per-user inbox |
| `profiles` → `reports` | 1:N | Reporter ownership (includes dispute-type reports) |
| `profiles` → `audit_logs` | 1:N | Actor trail (system actions nullable) |

**Booked dates:** Not a table. Derived from `rentals` in holding statuses (`APPROVED`, `HANDOVER_PENDING`, `ACTIVE`, `RETURN_PENDING`) for the listing’s date range.

---

## 3. Enum list

| Enum | Values | Notes |
|------|--------|-------|
| `UserRole` | `USER`, `ADMIN` | Authorization |
| `AppMode` | `BUYER`, `SELLER` | UI preference on profile only |
| `ProfileStatus` | `ACTIVE`, `SUSPENDED`, `DELETED` | Soft account control |
| `VerificationBadgeStatus` | `UNVERIFIED`, `PENDING`, `VERIFIED` | Future trust badge — not KYC MVP |
| `ListingStatus` | `DRAFT`, `ACTIVE`, `PAUSED`, `SOLD_OUT`, `ARCHIVED` | Publishing state |
| `RentPriceUnit` | `DAY`, `WEEK`, `MONTH` | Price period |
| `DepositType` | `NONE`, `FIXED`, `PERCENTAGE` | MVP UI: NONE + FIXED |
| `AvailabilityType` | `AVAILABLE`, `BLOCKED` | Seller calendar only (`BOOKED` is derived) |
| `RentalStatus` | `REQUESTED`, `REJECTED`, `APPROVED`, `HANDOVER_PENDING`, `ACTIVE`, `RETURN_PENDING`, `COMPLETED`, `CANCELLED`, `EXPIRED`, `DISPUTED` | Lifecycle |
| `VerificationStage` | `HANDOVER`, `RETURN` | Codes regenerated per stage |
| `VerificationMethod` | `QR`, `PIN` | How verification succeeded |
| `NotificationType` | `RENTAL_REQUESTED`, `RENTAL_APPROVED`, `RENTAL_REJECTED`, `RENTAL_CANCELLED`, `VERIFICATION_READY`, `HANDOVER_COMPLETED`, `RETURN_COMPLETED`, `NEW_MESSAGE`, `REVIEW_REMINDER`, `SYSTEM` | Extensible |
| `NotificationChannel` | `IN_APP`, `EMAIL`, `PUSH`, `SMS` | MVP: IN_APP + EMAIL |
| `NotificationStatus` | `PENDING`, `SENT`, `FAILED`, `READ` | Delivery/read tracking |
| `ReportTargetType` | `LISTING`, `USER`, `RENTAL`, `MESSAGE` | Polymorphic target |
| `ReportType` | `ABUSE`, `FRAUD`, `ITEM_ISSUE`, `DISPUTE`, `OTHER` | Dispute handled as report type in MVP |
| `ReportStatus` | `OPEN`, `IN_REVIEW`, `RESOLVED`, `DISMISSED` | Admin workflow |
| `ReviewTarget` | `USER` | Reviews rate the counterparty user (via rental context) |
| `AuditAction` | `CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`, `VERIFY`, `CONFIRM`, `LOGIN`, `ADMIN_ACTION`, `SYSTEM` | Extensible string-safe enum |

---

## 4. Entity field designs

Conventions used everywhere unless noted:

- PK: `id` UUID, default `gen_random_uuid()`
- Timestamps: `created_at`, `updated_at` timestamptz, `updated_at` auto-touch
- Money: `numeric(12,2)` + `currency` char(3) default `'PKR'`
- Soft delete: nullable `deleted_at` where listed

### 4.1 `profiles`

**Purpose:** App user profile, role, mode preference, trust metrics.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | — | **Same as** `auth.users.id` |
| `email` | TEXT | No | — | Synced from auth; unique |
| `display_name` | TEXT | No | — | |
| `avatar_url` | TEXT | Yes | null | Storage URL |
| `phone` | TEXT | Yes | null | Optional contact |
| `bio` | TEXT | Yes | null | |
| `role` | `UserRole` | No | `USER` | |
| `preferred_mode` | `AppMode` | No | `BUYER` | UI preference |
| `status` | `ProfileStatus` | No | `ACTIVE` | |
| `city` | TEXT | Yes | null | |
| `area` | TEXT | Yes | null | |
| `country_code` | CHAR(2) | No | `'PK'` | Multi-region ready |
| `lat` | DOUBLE PRECISION | Yes | null | Optional home/search bias |
| `lng` | DOUBLE PRECISION | Yes | null | |
| `avg_rating` | NUMERIC(3,2) | No | `0` | Denormalized trust |
| `rating_count` | INT | No | `0` | |
| `completed_rentals_count` | INT | No | `0` | |
| `response_time_minutes_avg` | INT | Yes | null | Derived metric |
| `cancellation_rate` | NUMERIC(5,4) | No | `0` | 0–1 |
| `verification_badge` | `VerificationBadgeStatus` | No | `UNVERIFIED` | Future |
| `member_since` | TIMESTAMPTZ | No | `now()` | Alias of created semantics |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |
| `deleted_at` | TIMESTAMPTZ | Yes | null | Soft delete |

**Unique:** `email`  
**Indexes:** `role`, `status`, `country_code`, `city`, `(lat, lng)` (later / bounding queries)

### 4.2 `categories`

**Purpose:** Dynamic taxonomy.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `name` | TEXT | No | — | |
| `slug` | TEXT | No | — | Unique |
| `icon` | TEXT | Yes | null | Lucide key / asset |
| `sort_order` | INT | No | `0` | |
| `is_active` | BOOLEAN | No | `true` | Soft-deactivate |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

**Unique:** `slug`  
**Indexes:** `(is_active, sort_order)`

### 4.3 `listings`

**Purpose:** Seller catalog item.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | Internal id |
| `seller_id` | UUID FK → profiles | No | — | ON DELETE RESTRICT |
| `category_id` | UUID FK → categories | No | — | ON DELETE RESTRICT |
| `title` | TEXT | No | — | max 100 (app check) |
| `slug` | TEXT | No | — | SEO unique |
| `description` | TEXT | No | — | max 500 (app check) |
| `status` | `ListingStatus` | No | `DRAFT` | |
| `rent_price_amount` | NUMERIC(12,2) | No | — | |
| `rent_price_unit` | `RentPriceUnit` | No | — | |
| `currency` | CHAR(3) | No | `'PKR'` | |
| `deposit_type` | `DepositType` | No | `NONE` | |
| `deposit_amount` | NUMERIC(12,2) | Yes | null | Required if FIXED |
| `deposit_percent` | NUMERIC(5,2) | Yes | null | Future PERCENTAGE |
| `city` | TEXT | No | — | |
| `area` | TEXT | No | — | |
| `country_code` | CHAR(2) | No | `'PK'` | |
| `lat` | DOUBLE PRECISION | No | — | Required for nearby |
| `lng` | DOUBLE PRECISION | No | — | |
| `view_count` | INT | No | `0` | Future sort: most viewed |
| `request_count` | INT | No | `0` | Future sort: most requested |
| `avg_rating` | NUMERIC(3,2) | Yes | null | **Not used for MVP “Highest Rated” sort** — that uses seller `profiles.avg_rating`. Reserved for future listing-level ratings. |
| `published_at` | TIMESTAMPTZ | Yes | null | |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |
| `deleted_at` | TIMESTAMPTZ | Yes | null | Soft delete |

**Explicit non-goals (MVP):** Do **not** store `wishlist_count` / `favorite_count` (or similar) on listings.

**Unique:** `slug`  
**Check (logical):**  
- If `deposit_type = NONE` → amounts null  
- If `FIXED` → `deposit_amount IS NOT NULL`  
- If `PERCENTAGE` → `deposit_percent IS NOT NULL`  
- `lat` between -90..90, `lng` between -180..180  

**Indexes:** see § Indexes

### 4.4 `listing_images`

**Purpose:** Listing media (min 1, max 10).

**Enforcement (approved):** Count limit enforced in the **application layer** for MVP. Database triggers/constraints deferred.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `listing_id` | UUID FK → listings | No | — | ON DELETE CASCADE |
| `storage_path` | TEXT | No | — | Supabase Storage path |
| `url` | TEXT | No | — | Public/signed URL cache |
| `sort_order` | INT | No | `0` | |
| `width` | INT | Yes | null | |
| `height` | INT | Yes | null | |
| `byte_size` | INT | Yes | null | Enforce ≤ 5MB in app |
| `created_at` | TIMESTAMPTZ | No | `now()` | |

**Unique:** `(listing_id, sort_order)`  
**Indexes:** `listing_id`

### 4.5 `listing_availability`

**Purpose:** Seller AVAILABLE / BLOCKED windows. Recurring = future column set.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `listing_id` | UUID FK → listings | No | — | ON DELETE CASCADE |
| `type` | `AvailabilityType` | No | — | AVAILABLE \| BLOCKED |
| `start_date` | DATE | No | — | Inclusive |
| `end_date` | DATE | No | — | Inclusive |
| `notes` | TEXT | Yes | null | |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

**Check:** `end_date >= start_date`  
**Indexes:** `(listing_id, start_date, end_date)`, `(listing_id, type)`  
**Future:** `rrule` / `recurrence_rule` TEXT nullable — reserved, not required for MVP

### 4.6 `rentals`

**Purpose:** Core marketplace transaction lifecycle (no payments).

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `listing_id` | UUID FK → listings | No | — | RESTRICT |
| `buyer_id` | UUID FK → profiles | No | — | RESTRICT |
| `seller_id` | UUID FK → profiles | No | — | RESTRICT (denormalized from listing for query speed) |
| `status` | `RentalStatus` | No | `REQUESTED` | |
| `start_date` | DATE | No | — | Requested rental start |
| `end_date` | DATE | No | — | Requested rental end |
| `message_to_seller` | TEXT | Yes | null | Optional request note |
| `currency` | CHAR(3) | No | `'PKR'` | Snapshot |
| `rent_price_amount` | NUMERIC(12,2) | No | — | Snapshot at request |
| `rent_price_unit` | `RentPriceUnit` | No | — | Snapshot |
| `deposit_type` | `DepositType` | No | — | Snapshot |
| `deposit_amount` | NUMERIC(12,2) | Yes | null | Snapshot |
| `deposit_percent` | NUMERIC(5,2) | Yes | null | Snapshot |
| `rejection_reason` | TEXT | Yes | null | |
| `cancellation_reason` | TEXT | Yes | null | |
| `cancelled_by` | UUID FK → profiles | Yes | null | |
| `approved_at` | TIMESTAMPTZ | Yes | null | |
| `activated_at` | TIMESTAMPTZ | Yes | null | Handover both confirmed |
| `completed_at` | TIMESTAMPTZ | Yes | null | |
| `disputed_at` | TIMESTAMPTZ | Yes | null | |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

**Check:** `end_date >= start_date`; `buyer_id <> seller_id`  
**Indexes:** see § Indexes

### 4.7 `rental_verifications`

**Purpose:** QR + PIN secrets per stage; regenerate without rewriting rental history.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `rental_id` | UUID FK → rentals | No | — | CASCADE |
| `stage` | `VerificationStage` | No | — | HANDOVER \| RETURN |
| `qr_payload` | TEXT | No | — | Unsigned display payload source OR signed string |
| `qr_hash` | TEXT | No | — | HMAC/hash for validation |
| `pin_hash` | TEXT | No | — | bcrypt/argon2 only |
| `generated_at` | TIMESTAMPTZ | No | `now()` | |
| `expires_at` | TIMESTAMPTZ | No | — | e.g. generated_at + 1h |
| `failed_attempts` | INT | No | `0` | PIN fails |
| `locked_until` | TIMESTAMPTZ | Yes | null | After 5 fails → +15m |
| `verified_at` | TIMESTAMPTZ | Yes | null | First successful verify |
| `verified_by` | UUID FK → profiles | Yes | null | Who scanned/entered |
| `verified_method` | `VerificationMethod` | Yes | null | QR \| PIN |
| `is_current` | BOOLEAN | No | `true` | Regen inserts new row; previous rows set `is_current=false` |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

**Append-only (approved):** Never overwrite PIN/QR hashes in place. Regeneration always inserts a new row.

**Unique (partial):** at most one `is_current = true` per `(rental_id, stage)`  
**Indexes:** `(rental_id, stage, is_current)`, `expires_at`

### 4.8 `rental_confirmations`

**Purpose:** Mutual confirmation after successful verify.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `rental_id` | UUID FK → rentals | No | — | CASCADE |
| `stage` | `VerificationStage` | No | — | |
| `buyer_confirmed` | BOOLEAN | No | `false` | |
| `seller_confirmed` | BOOLEAN | No | `false` | |
| `buyer_confirmed_at` | TIMESTAMPTZ | Yes | null | |
| `seller_confirmed_at` | TIMESTAMPTZ | Yes | null | |
| `completed_at` | TIMESTAMPTZ | Yes | null | When both true |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

**Unique:** `(rental_id, stage)`  
**Indexes:** `rental_id`

### 4.9 `conversations`

**Purpose:** One chat thread per rental.

**Lifecycle (approved):**

- Created when rental status becomes **`REQUESTED`**
- If rental is **`REJECTED`** or **`CANCELLED`**, conversation remains available as **read-only** history (no new messages)
- Writable while rental is in an active coordination path (`REQUESTED`, `APPROVED`, `HANDOVER_PENDING`, `ACTIVE`, `RETURN_PENDING`, `DISPUTED` as product rules allow)

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `rental_id` | UUID FK → rentals | No | — | UNIQUE, CASCADE |
| `buyer_id` | UUID FK → profiles | No | — | Denorm |
| `seller_id` | UUID FK → profiles | No | — | Denorm |
| `is_readonly` | BOOLEAN | No | `false` | Set true when rental rejected/cancelled |
| `last_message_at` | TIMESTAMPTZ | Yes | null | |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

**Unique:** `rental_id`  
**Indexes:** `(buyer_id, last_message_at DESC)`, `(seller_id, last_message_at DESC)`

### 4.10 `messages`

**Purpose:** Realtime chat content.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `conversation_id` | UUID FK → conversations | No | — | CASCADE |
| `sender_id` | UUID FK → profiles | No | — | RESTRICT |
| `body` | TEXT | No | — | Sanitized in app |
| `read_at` | TIMESTAMPTZ | Yes | null | Per-message read (MVP simple) |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `deleted_at` | TIMESTAMPTZ | Yes | null | Soft delete |

**Indexes:** `(conversation_id, created_at)`, `sender_id`

### 4.11 `reviews`

**Purpose:** Post-`COMPLETED` bilateral feedback.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `rental_id` | UUID FK → rentals | No | — | RESTRICT |
| `reviewer_id` | UUID FK → profiles | No | — | |
| `reviewee_id` | UUID FK → profiles | No | — | Counterparty |
| `target` | `ReviewTarget` | No | `USER` | |
| `rating` | SMALLINT | No | — | 1–5 check |
| `comment` | TEXT | Yes | null | |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

**Unique:** `(rental_id, reviewer_id)` — one review per party per rental  
**Check:** `rating BETWEEN 1 AND 5`; `reviewer_id <> reviewee_id`  
**Indexes:** `(reviewee_id, created_at DESC)`, `rental_id`

### 4.12 `wishlists`

**Purpose:** Saved listings.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `user_id` | UUID FK → profiles | No | — | CASCADE |
| `listing_id` | UUID FK → listings | No | — | CASCADE |
| `created_at` | TIMESTAMPTZ | No | `now()` | |

**Unique:** `(user_id, listing_id)`  
**Indexes:** `(user_id, created_at DESC)`, `listing_id`

### 4.13 `notifications`

**Purpose:** In-app + email outbox (push/SMS later).

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `user_id` | UUID FK → profiles | No | — | CASCADE |
| `type` | `NotificationType` | No | — | |
| `channel` | `NotificationChannel` | No | — | |
| `status` | `NotificationStatus` | No | `PENDING` | |
| `title` | TEXT | No | — | |
| `body` | TEXT | No | — | |
| `payload` | JSONB | Yes | null | Deep links / ids |
| `rental_id` | UUID FK → rentals | Yes | null | Optional context |
| `listing_id` | UUID FK → listings | Yes | null | Optional context |
| `delivered_at` | TIMESTAMPTZ | Yes | null | Channel delivery confirmation |
| `read_at` | TIMESTAMPTZ | Yes | null | User read (primarily IN_APP) |
| `sent_at` | TIMESTAMPTZ | Yes | null | Worker accepted/sent |
| `failed_reason` | TEXT | Yes | null | |
| `created_at` | TIMESTAMPTZ | No | `now()` | |

**Indexes:** `(user_id, created_at DESC)`, `(user_id, read_at)`, `(status, channel, created_at)` for workers

### 4.14 `reports`

**Purpose:** Abuse / dispute intake for admin — **single table for MVP**.

Dispute handling is represented via `ReportType = DISPUTE` (and related targets). A dedicated disputes module may evolve later without redesigning the ledger.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `reporter_id` | UUID FK → profiles | No | — | RESTRICT |
| `type` | `ReportType` | No | — | Includes `DISPUTE` |
| `target_type` | `ReportTargetType` | No | — | |
| `target_id` | UUID | No | — | Polymorphic id |
| `rental_id` | UUID FK → rentals | Yes | null | When related |
| `reason` | TEXT | No | — | |
| `details` | TEXT | Yes | null | |
| `status` | `ReportStatus` | No | `OPEN` | |
| `assigned_admin_id` | UUID FK → profiles | Yes | null | |
| `resolution_notes` | TEXT | Yes | null | |
| `resolved_at` | TIMESTAMPTZ | Yes | null | |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `now()` | |

**Indexes:** `(status, created_at DESC)`, `(type, status)`, `(target_type, target_id)`, `reporter_id`

### 4.15 `audit_logs`

**Purpose:** Immutable-ish security/lifecycle trail.

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `id` | UUID PK | No | uuid | |
| `actor_id` | UUID FK → profiles | Yes | null | null = system |
| `action` | `AuditAction` / TEXT | No | — | |
| `entity_type` | TEXT | No | — | e.g. `rental` |
| `entity_id` | UUID | No | — | |
| `metadata` | JSONB | Yes | null | Before/after diffs |
| `ip` | INET | Yes | null | Optional — locked recommendation |
| `user_agent` | TEXT | Yes | null | Optional — locked recommendation |
| `created_at` | TIMESTAMPTZ | No | `now()` | No updated_at |

**Indexes:** `(entity_type, entity_id, created_at DESC)`, `(actor_id, created_at DESC)`, `(created_at DESC)`  
**Rule:** Append-only; no updates/deletes from app

---

## 5. Constraints & data integrity

### Foreign key behaviour

| Child → Parent | On delete | Why |
|----------------|-----------|-----|
| listings → profiles | RESTRICT | Preserve commerce history |
| listings → categories | RESTRICT | Soft-deactivate category instead |
| listing_images → listings | CASCADE | Images die with listing |
| listing_availability → listings | CASCADE | |
| rentals → listing/buyer/seller | RESTRICT | Keep rental ledger |
| rental_verifications → rentals | CASCADE | Tied to rental |
| rental_confirmations → rentals | CASCADE | |
| conversations → rentals | CASCADE | |
| messages → conversations | CASCADE | |
| wishlists → user/listing | CASCADE | |
| notifications → user | CASCADE | |
| reviews → rental | RESTRICT | Keep trust history |
| reports → reporter | RESTRICT | |
| audit_logs → actor | SET NULL | Keep logs if user removed |

### Unique constraints (summary)

- `profiles.email`
- `categories.slug`
- `listings.slug`
- `listing_images (listing_id, sort_order)`
- `rental_confirmations (rental_id, stage)`
- `rental_verifications` partial unique current per `(rental_id, stage)`
- `conversations.rental_id`
- `wishlists (user_id, listing_id)`
- `reviews (rental_id, reviewer_id)`

### Check constraints (summary)

- Date ranges `end >= start`
- Rating 1–5
- Geo bounds
- Deposit type/amount coherence
- `buyer_id <> seller_id` on rentals
- Image count 1–10 enforced in **application layer** (MVP approved); DB trigger deferred

### Transactions (application-level, documented for Phase 1B+)

| Operation | Must be transactional |
|-----------|----------------------|
| Create rental request | status → REQUESTED + create conversation + notifications |
| Approve rental | status → APPROVED + create HANDOVER verification (append) + confirmation row + notifications |
| Regenerate codes | set prior current verification `is_current=false` + **insert** new current row |
| Reject / cancel rental | status update + set `conversations.is_readonly=true` + notifications |
| Successful verify + both confirms | confirmation update + status transition + timestamps + audit |
| Complete return | status COMPLETED + unlock reviews + trust metric updates |
| Overlap check | serializable/repeatable-read around approve against competing rentals |

---

## 6. Business rules (database-oriented)

### Rental lifecycle

`REQUESTED → APPROVED → HANDOVER_PENDING → ACTIVE → RETURN_PENDING → COMPLETED`  
Side paths: `REJECTED`, `CANCELLED`, `EXPIRED`, `DISPUTED`  
Transitions enforced in domain (Phase later) + optional DB enum; never skip stages.

### QR/PIN lifecycle

- On approve: insert `rental_verifications` stage=`HANDOVER`, `is_current=true`
- Expiry window (e.g. 1 hour); regen **inserts a new row** and sets previous current row(s) for that stage to `is_current=false` (append-only; approved)
- On return start: **new** stage=`RETURN` verification row (never reuse HANDOVER secrets)
- PIN: hash only; 5 fails → `locked_until = now()+15m`
- Verify online only; store `verified_method`, `verified_by`, `verified_at`

### Availability overlap prevention

A date range is **not bookable** if it intersects:

1. Any `listing_availability` where `type=BLOCKED`, or  
2. Any rental for same listing in `{APPROVED, HANDOVER_PENDING, ACTIVE, RETURN_PENDING}` with overlapping dates  

`AVAILABLE` windows define seller intent; requests should still fall within an AVAILABLE span (product rule).

### Wishlist uniqueness

`(user_id, listing_id)` unique — toggles insert/delete.  
**Do not** denormalize wishlist/favorite counts onto listings in MVP.

### Review eligibility

- Rental `status = COMPLETED`
- Reviewer is buyer or seller of that rental
- One review per `(rental_id, reviewer_id)`
- Reviewee is the other party
- MVP “Highest Rated” listing sort uses **seller** `profiles.avg_rating`

### Chat ownership

- Conversation is 1:1 with rental
- **Created when rental enters `REQUESTED`**
- Only `buyer_id` / `seller_id` may read; write allowed only while not read-only
- On `REJECTED` / `CANCELLED`: set `conversations.is_readonly = true` (history retained)

### Notification ownership

- Every notification has exactly one `user_id` recipient
- Channels independent rows (e.g. IN_APP + EMAIL as two rows) sharing payload/type
- Track `delivered_at` and `read_at` (plus `sent_at` for worker pipeline)

### Guests

- Guests have **no** `profiles` row
- Public browse/search/detail only
- Any rental request, chat, wishlist, review, verify, or similar requires authentication + profile

### Audit logging

- Append-only on sensitive events: approve/reject, verify, confirm, status changes, admin actions, code regen
- Optional `ip` + `user_agent` when available
- Never store plaintext PIN in metadata

### Soft delete strategy

| Entity | Strategy |
|--------|----------|
| profiles | `status` + `deleted_at` |
| listings | `deleted_at` (+ status ARCHIVED) |
| categories | `is_active=false` (no hard delete) |
| messages | `deleted_at` |
| wishlists | hard delete row |
| rentals / reviews / audit | **no soft delete** — retain ledger |

---

## 7. Index recommendations

### Search / filter / sort / nearby

```
listings (status, deleted_at, country_code, city)
listings (category_id, status, created_at DESC)
listings (status, rent_price_amount)
listings (status, published_at DESC)
listings (status, avg_rating DESC NULLS LAST)  -- optional later; MVP Highest Rated uses seller join
-- MVP Highest Rated: join listings.seller_id → profiles.avg_rating
listings (status, view_count DESC)          -- future
listings (status, request_count DESC)       -- future
listings (lat, lng)                         -- bbox prefilter for Haversine
listings (slug) UNIQUE
```

### Rentals / admin

```
rentals (buyer_id, created_at DESC)
rentals (seller_id, created_at DESC)
rentals (listing_id, status, start_date, end_date)  -- overlap checks
rentals (status, created_at DESC)
```

### Chat

```
conversations (buyer_id, last_message_at DESC)
conversations (seller_id, last_message_at DESC)
messages (conversation_id, created_at)
```

### Notifications / reviews / wishlist

```
notifications (user_id, created_at DESC)
notifications (user_id, read_at) WHERE read_at IS NULL  -- unread badge
reviews (reviewee_id, created_at DESC)
wishlists (user_id, created_at DESC)
```

### Admin analytics

```
reports (status, created_at DESC)
audit_logs (created_at DESC)
listings (country_code, city, status)
rentals (status)  -- active rentals count
profiles (created_at)  -- growth
```

**Partitioning (later, no redesign):** `messages`, `notifications`, `audit_logs` by time range.

---

## 8. Scalability notes

| Concern | Design support |
|---------|----------------|
| Millions of listings | UUID PKs, filtered composite indexes, bbox+Haversine then PostGIS later, soft delete |
| Large chat history | `messages` append-only + time partition later; Realtime by conversation channel |
| High rental volume | Overlap index on `(listing_id, status, dates)`; status machine denorm timestamps |
| Future countries | `country_code` on profiles/listings; currency char(3) |
| Future payments | No payment tables now; rentals already snapshot price/deposit — add `payments` later keyed by `rental_id` |
| Future delivery | Add optional `fulfillment` module later; rental remains source of truth for parties/dates |

---

## 9. Database design summary

SamaanX’s logical model is a **rental-centric ledger**: listings are catalog; rentals own verification, confirmation, chat, and reviews. Auth stays in Supabase; `profiles` is the app user (**guests have none**). Categories are data-driven. Availability is explicit AVAILABLE/BLOCKED with **booked dates derived** from active rentals. QR/PIN lives in **append-only** verification rows per stage (`is_current`). Conversations are created at **`REQUESTED`** and become **read-only** on reject/cancel. Notifications track `delivered_at` + `read_at`. Reports (including disputes) share one table. Soft deletes protect catalog/UX without erasing commercial history. Wishlist counts are **not** denormalized in MVP. “Highest Rated” uses **seller** average rating for MVP.

---

## 10. Open questions

**None.** All Phase 1A design questions are resolved and locked above.

---

## Explicit non-outputs (this phase)

- No Prisma schema models  
- No migrations  
- No APIs / Server Actions / UI / auth implementation  

---

## Document control

| Field | Value |
|-------|-------|
| Version | Phase 1A Design 1.1 (frozen) |
| Inputs | Architecture v1.2 + approved Phase 1A decisions |
| Next | Phase 1B — Prisma schema & migrations (awaiting dedicated prompt) |
