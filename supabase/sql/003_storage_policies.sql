-- =============================================================================
-- SamaanX — 003_storage_policies.sql
-- Storage object policies. Path convention: {bucket}/{auth.uid()}/...
-- =============================================================================

-- Drop prior SamaanX storage policies if re-running (idempotent-ish)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE 'rentpe_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- listing-images (PUBLIC read)
-- -----------------------------------------------------------------------------

CREATE POLICY rentpe_listing_images_select_public
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listing-images');

CREATE POLICY rentpe_listing_images_insert_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY rentpe_listing_images_update_own
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY rentpe_listing_images_delete_own
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);

-- -----------------------------------------------------------------------------
-- avatars (PUBLIC read)
-- -----------------------------------------------------------------------------

CREATE POLICY rentpe_avatars_select_public
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY rentpe_avatars_insert_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY rentpe_avatars_update_own
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY rentpe_avatars_delete_own
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);

-- -----------------------------------------------------------------------------
-- verification-assets (PRIVATE)
-- Prefer server-side access; owners may manage own folder. No public read.
-- -----------------------------------------------------------------------------

CREATE POLICY rentpe_verification_assets_select_own
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-assets'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);

CREATE POLICY rentpe_verification_assets_insert_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY rentpe_verification_assets_delete_own
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-assets'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);

-- -----------------------------------------------------------------------------
-- documents (PRIVATE)
-- -----------------------------------------------------------------------------

CREATE POLICY rentpe_documents_select_own
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);

CREATE POLICY rentpe_documents_insert_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY rentpe_documents_delete_own
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);

-- -----------------------------------------------------------------------------
-- chat-media (PRIVATE) — path: chat-media/{userId}/{conversationId}/...
-- -----------------------------------------------------------------------------

CREATE POLICY rentpe_chat_media_select_participant
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (
    public.is_admin()
    OR (
      auth.uid()::text = (storage.foldername(name))[1]
    )
    OR (
      (storage.foldername(name))[2] IS NOT NULL
      AND public.is_conversation_participant(((storage.foldername(name))[2])::uuid)
    )
  )
);

CREATE POLICY rentpe_chat_media_insert_own
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    (storage.foldername(name))[2] IS NULL
    OR public.conversation_is_writable(((storage.foldername(name))[2])::uuid)
  )
);

CREATE POLICY rentpe_chat_media_delete_own
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);
