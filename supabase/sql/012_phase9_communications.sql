-- Phase 9: Communication, notifications, email, push, scheduled jobs.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_chat_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_rental_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_marketing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_weekly_digest_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_prompt_dismissed_at timestamptz;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS notifications_user_id_deleted_at_idx
  ON public.notifications (user_id, deleted_at);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);

CREATE TYPE public.scheduled_job_type AS ENUM (
  'RENTAL_STARTING_TOMORROW',
  'RENTAL_STARTING_SOON',
  'RENTAL_ENDING_SOON',
  'RETURN_OVERDUE',
  'CHAT_UNREAD_REMINDER',
  'LISTING_INACTIVE',
  'WEEKLY_SELLER_SUMMARY',
  'WEEKLY_BUYER_DIGEST',
  'REVIEW_REMINDER'
);

CREATE TYPE public.scheduled_job_status AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.scheduled_job_type NOT NULL,
  status public.scheduled_job_status NOT NULL DEFAULT 'PENDING',
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rental_id uuid REFERENCES public.rentals(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  payload jsonb,
  dedupe_key text NOT NULL UNIQUE,
  run_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_jobs_status_run_at_idx
  ON public.scheduled_jobs (status, run_at);

CREATE TABLE IF NOT EXISTS public.email_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_key text NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_send_logs_user_id_sent_at_idx
  ON public.email_send_logs (user_id, sent_at DESC);

-- Extend notification types (idempotent via check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'SECURITY_ALERT'
  ) THEN
    ALTER TYPE public."NotificationType" ADD VALUE 'SECURITY_ALERT';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'ACCOUNT_CHANGE'
  ) THEN
    ALTER TYPE public."NotificationType" ADD VALUE 'ACCOUNT_CHANGE';
  END IF;
END $$;
