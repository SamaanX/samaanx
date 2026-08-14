-- Announcement delivery: per-user targeting + dismissals.

ALTER TYPE public.announcement_target ADD VALUE IF NOT EXISTS 'USER';

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS announcements_target_user_active_idx
  ON public.announcements (target_user_id, is_active)
  WHERE target_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.announcement_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS announcement_dismissals_user_idx
  ON public.announcement_dismissals (user_id);

ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcement_dismissals_own ON public.announcement_dismissals;
CREATE POLICY announcement_dismissals_own ON public.announcement_dismissals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
