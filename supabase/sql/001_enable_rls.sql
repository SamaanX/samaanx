-- =============================================================================
-- SamaanX — 001_enable_rls.sql
-- Enable Row Level Security on all application tables + security helper functions.
-- Prisma / service-role connections bypass RLS; anon & authenticated do not.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, locked search_path)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
      AND p.deleted_at IS NULL
      AND p.status = 'ACTIVE'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'True when auth.uid() is an ACTIVE ADMIN profile.';

CREATE OR REPLACE FUNCTION public.is_rental_party(p_rental_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rentals r
    WHERE r.id = p_rental_id
      AND (r.buyer_id = auth.uid() OR r.seller_id = auth.uid())
  );
$$;

COMMENT ON FUNCTION public.is_rental_party(uuid) IS
  'True when auth.uid() is buyer or seller of the rental.';

CREATE OR REPLACE FUNCTION public.owns_listing(p_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings l
    WHERE l.id = p_listing_id
      AND l.seller_id = auth.uid()
      AND l.deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION public.owns_listing(uuid) IS
  'True when auth.uid() owns the listing.';

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  );
$$;

COMMENT ON FUNCTION public.is_conversation_participant(uuid) IS
  'True when auth.uid() is buyer or seller on the conversation.';

CREATE OR REPLACE FUNCTION public.conversation_is_writable(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
      AND c.is_readonly = false
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS (deny-by-default until policies are attached)
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners as well (defense in depth for non-superuser roles)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.listings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images FORCE ROW LEVEL SECURITY;
ALTER TABLE public.listing_availability FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rentals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rental_verifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rental_confirmations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
