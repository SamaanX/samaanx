-- Repair feedback table if 018 was applied with snake_case enum types (feedback_category / feedback_status).
-- Safe to run even when the correct schema already exists.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'feedback_category'
  ) THEN
    DROP TABLE IF EXISTS public.user_feedback;
    DROP TYPE IF EXISTS public.feedback_category;
    DROP TYPE IF EXISTS public.feedback_status;
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "FeedbackCategory" AS ENUM (
    'BUG',
    'FEATURE',
    'UX',
    'GENERAL',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FeedbackStatus" AS ENUM (
    'OPEN',
    'IN_REVIEW',
    'RESOLVED',
    'DISMISSED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  category "FeedbackCategory" NOT NULL,
  subject VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  page_url TEXT,
  status "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
  assigned_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_status_created
  ON user_feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id
  ON user_feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feedback_category
  ON user_feedback (category);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rentpe_feedback_select_own_or_admin ON public.user_feedback;
CREATE POLICY rentpe_feedback_select_own_or_admin
ON public.user_feedback
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS rentpe_feedback_insert_own ON public.user_feedback;
CREATE POLICY rentpe_feedback_insert_own
ON public.user_feedback
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rentpe_feedback_update_admin ON public.user_feedback;
CREATE POLICY rentpe_feedback_update_admin
ON public.user_feedback
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
