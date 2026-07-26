-- =============================================================================
-- SamaanX — 007_chat_messaging.sql
-- Phase 6 messaging: message fields, hides, last_seen, chat-media mimes, RLS
-- Safe to re-run.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

DO $$ BEGIN
  CREATE TYPE public."MessageAttachmentKind" AS ENUM ('IMAGE', 'DOCUMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid,
  ADD COLUMN IF NOT EXISTS attachment_kind public."MessageAttachmentKind",
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text,
  ADD COLUMN IF NOT EXISTS attachment_size integer,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

ALTER TABLE public.messages
  ALTER COLUMN body SET DEFAULT '';

DO $$ BEGIN
  ALTER TABLE public.messages
    ADD CONSTRAINT messages_reply_to_id_fkey
    FOREIGN KEY (reply_to_id) REFERENCES public.messages(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS messages_reply_to_id_idx ON public.messages (reply_to_id);

CREATE TABLE IF NOT EXISTS public.message_hides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_hides_message_id_user_id_key UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_hides_user_id_idx ON public.message_hides (user_id);

ALTER TABLE public.message_hides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_hides FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rentpe_message_hides_select_own ON public.message_hides;
CREATE POLICY rentpe_message_hides_select_own
ON public.message_hides
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS rentpe_message_hides_insert_own ON public.message_hides;
CREATE POLICY rentpe_message_hides_insert_own
ON public.message_hides
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_conversation_participant(
    (SELECT m.conversation_id FROM public.messages m WHERE m.id = message_id)
  )
);

DROP POLICY IF EXISTS rentpe_message_hides_delete_own ON public.message_hides;
CREATE POLICY rentpe_message_hides_delete_own
ON public.message_hides
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- Expand chat-media MIME allowlist (images + docs).
UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]::text[],
  file_size_limit = 10485760
WHERE id = 'chat-media';

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'message_hides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_hides;
  END IF;
END $$;
