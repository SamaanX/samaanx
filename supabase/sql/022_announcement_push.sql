-- Phase 12B: Admin broadcast push — target URL + delivery stats on announcements.

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS delivery_recipient_count integer,
  ADD COLUMN IF NOT EXISTS delivery_push_attempted integer,
  ADD COLUMN IF NOT EXISTS delivery_push_success integer,
  ADD COLUMN IF NOT EXISTS delivery_push_failed integer,
  ADD COLUMN IF NOT EXISTS delivery_expired_removed integer,
  ADD COLUMN IF NOT EXISTS delivery_completed_at timestamptz;
