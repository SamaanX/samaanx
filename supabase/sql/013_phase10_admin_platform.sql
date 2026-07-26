-- Phase 10: Admin platform — roles, moderation, disputes, settings, announcements.
--
-- IMPORTANT: Run 013_phase10_admin_enums.sql FIRST (separate query / commit),
-- then run this file. PostgreSQL cannot use new enum values in the same transaction.

-- Listing moderation
DO $$ BEGIN
  CREATE TYPE public.listing_moderation_status AS ENUM (
    'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS moderation_status public.listing_moderation_status NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

CREATE INDEX IF NOT EXISTS listings_moderation_status_created_at_idx
  ON public.listings (moderation_status, created_at DESC);

-- Disputes
DO $$ BEGIN
  CREATE TYPE public.dispute_status AS ENUM (
    'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES public.rentals(id) ON DELETE RESTRICT,
  opened_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status public.dispute_status NOT NULL DEFAULT 'OPEN',
  buyer_statement text,
  seller_statement text,
  admin_notes text,
  evidence jsonb,
  resolution text,
  assigned_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS disputes_status_created_at_idx
  ON public.disputes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS disputes_rental_id_idx
  ON public.disputes (rental_id);
CREATE INDEX IF NOT EXISTS disputes_assigned_admin_status_idx
  ON public.disputes (assigned_admin_id, status);

-- Platform settings (singleton keys)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (key, value) VALUES
  ('marketplace', '{"maintenanceMode":false,"maxActiveListingsPerSeller":50,"maxRentalDays":90,"defaultDepositType":"NONE","supportEmail":"support@samaanx.com","platformAnnouncement":null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Announcements
DO $$ BEGIN
  CREATE TYPE public.announcement_target AS ENUM (
    'ALL', 'BUYERS', 'SELLERS', 'ADMINS'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  target public.announcement_target NOT NULL DEFAULT 'ALL',
  dismissible boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_active_starts_at_idx
  ON public.announcements (is_active, starts_at DESC);

-- Audit log enhancements
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS previous_value jsonb,
  ADD COLUMN IF NOT EXISTS new_value jsonb;

-- Admin helper includes SUPER_ADMIN
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
      AND p.role IN ('ADMIN', 'SUPER_ADMIN')
      AND p.deleted_at IS NULL
      AND p.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
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
      AND p.role = 'SUPER_ADMIN'
      AND p.deleted_at IS NULL
      AND p.status = 'ACTIVE'
  );
$$;

-- RLS for new tables
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS disputes_select_party ON public.disputes;
CREATE POLICY disputes_select_party ON public.disputes
  FOR SELECT USING (
    public.is_admin()
    OR opened_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.rentals r
      WHERE r.id = rental_id
        AND (r.buyer_id = auth.uid() OR r.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS disputes_admin_all ON public.disputes;
CREATE POLICY disputes_admin_all ON public.disputes
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS platform_settings_admin ON public.platform_settings;
CREATE POLICY platform_settings_admin ON public.platform_settings
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS announcements_select ON public.announcements;
CREATE POLICY announcements_select ON public.announcements
  FOR SELECT USING (
    is_active = true
    OR public.is_admin()
  );

DROP POLICY IF EXISTS announcements_admin ON public.announcements;
CREATE POLICY announcements_admin ON public.announcements
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Realtime for admin queues (ignore error if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
