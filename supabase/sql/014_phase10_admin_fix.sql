-- Phase 10 fix: align PostgreSQL enum type names with Prisma @@map (if 013 used snake_case types).
-- Safe to run after 013_phase10_admin_platform.sql. Idempotent.

-- No-op if Prisma @@map("listing_moderation_status") already matches DB.
-- If admin dashboard fails with ListingModerationStatus does not exist, ensure 013 ran fully.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_moderation_status') THEN
    CREATE TYPE public.listing_moderation_status AS ENUM (
      'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'
    );
  END IF;
END $$;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS moderation_status public.listing_moderation_status NOT NULL DEFAULT 'APPROVED';

-- Promote configured super admin (run once)
UPDATE public.profiles
SET role = 'SUPER_ADMIN'
WHERE lower(email) = lower('samaanx25@gmail.com');
