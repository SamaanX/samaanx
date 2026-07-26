-- =============================================================================
-- SamaanX — 004_table_policies.sql
-- Table RLS policies. Idempotent: drops prior rentpe_* policies then recreates.
-- =============================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'rentpe_%'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );
  END LOOP;
END $$;

-- =============================================================================
-- profiles
-- =============================================================================

CREATE POLICY rentpe_profiles_select_public
ON public.profiles
FOR SELECT
TO public
USING (deleted_at IS NULL AND status = 'ACTIVE');

CREATE POLICY rentpe_profiles_select_own_any_status
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin());

CREATE POLICY rentpe_profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

-- Inserts typically via service role after auth signup; allow self-insert for edge cases
CREATE POLICY rentpe_profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid() OR public.is_admin());

-- =============================================================================
-- categories
-- =============================================================================

CREATE POLICY rentpe_categories_select_active
ON public.categories
FOR SELECT
TO public
USING (is_active = true OR public.is_admin());

CREATE POLICY rentpe_categories_admin_write
ON public.categories
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =============================================================================
-- listings
-- =============================================================================

CREATE POLICY rentpe_listings_select_public_active
ON public.listings
FOR SELECT
TO public
USING (
  (status = 'ACTIVE' AND deleted_at IS NULL)
  OR seller_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY rentpe_listings_insert_own
ON public.listings
FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid() OR public.is_admin());

CREATE POLICY rentpe_listings_update_own
ON public.listings
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid() OR public.is_admin())
WITH CHECK (seller_id = auth.uid() OR public.is_admin());

CREATE POLICY rentpe_listings_delete_own
ON public.listings
FOR DELETE
TO authenticated
USING (seller_id = auth.uid() OR public.is_admin());

-- =============================================================================
-- listing_images
-- =============================================================================

CREATE POLICY rentpe_listing_images_select
ON public.listing_images
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.listings l
    WHERE l.id = listing_id
      AND (
        (l.status = 'ACTIVE' AND l.deleted_at IS NULL)
        OR l.seller_id = auth.uid()
        OR public.is_admin()
      )
  )
);

CREATE POLICY rentpe_listing_images_insert_own
ON public.listing_images
FOR INSERT
TO authenticated
WITH CHECK (public.owns_listing(listing_id) OR public.is_admin());

CREATE POLICY rentpe_listing_images_update_own
ON public.listing_images
FOR UPDATE
TO authenticated
USING (public.owns_listing(listing_id) OR public.is_admin())
WITH CHECK (public.owns_listing(listing_id) OR public.is_admin());

CREATE POLICY rentpe_listing_images_delete_own
ON public.listing_images
FOR DELETE
TO authenticated
USING (public.owns_listing(listing_id) OR public.is_admin());

-- =============================================================================
-- listing_availability
-- =============================================================================

CREATE POLICY rentpe_listing_availability_select
ON public.listing_availability
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.listings l
    WHERE l.id = listing_id
      AND (
        (l.status = 'ACTIVE' AND l.deleted_at IS NULL)
        OR l.seller_id = auth.uid()
        OR public.is_admin()
      )
  )
);

CREATE POLICY rentpe_listing_availability_write
ON public.listing_availability
FOR ALL
TO authenticated
USING (public.owns_listing(listing_id) OR public.is_admin())
WITH CHECK (public.owns_listing(listing_id) OR public.is_admin());

-- =============================================================================
-- rentals
-- =============================================================================

CREATE POLICY rentpe_rentals_select_parties
ON public.rentals
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY rentpe_rentals_insert_as_buyer
ON public.rentals
FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid() OR public.is_admin());

CREATE POLICY rentpe_rentals_update_parties
ON public.rentals
FOR UPDATE
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR public.is_admin()
);

-- =============================================================================
-- rental_verifications
-- Sensitive: pin_hash / qr secrets — NO client SELECT/WRITE.
-- Access only via Prisma service / postgres role (bypasses RLS).
-- Admin may SELECT for support (still avoid returning pin_hash in APIs).
-- =============================================================================

CREATE POLICY rentpe_rental_verifications_admin_select
ON public.rental_verifications
FOR SELECT
TO authenticated
USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policies for JWT roles (service role only).

-- =============================================================================
-- rental_confirmations
-- =============================================================================

CREATE POLICY rentpe_rental_confirmations_select_parties
ON public.rental_confirmations
FOR SELECT
TO authenticated
USING (public.is_rental_party(rental_id) OR public.is_admin());

CREATE POLICY rentpe_rental_confirmations_update_parties
ON public.rental_confirmations
FOR UPDATE
TO authenticated
USING (public.is_rental_party(rental_id) OR public.is_admin())
WITH CHECK (public.is_rental_party(rental_id) OR public.is_admin());

-- Inserts created by server on approve — service role; optional party insert blocked.

-- =============================================================================
-- conversations
-- =============================================================================

CREATE POLICY rentpe_conversations_select_parties
ON public.conversations
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY rentpe_conversations_update_parties
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR public.is_admin()
);

-- Inserts via service role when rental enters REQUESTED.

-- =============================================================================
-- messages
-- =============================================================================

CREATE POLICY rentpe_messages_select_participants
ON public.messages
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(conversation_id)
  OR public.is_admin()
);

CREATE POLICY rentpe_messages_insert_writable
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    public.conversation_is_writable(conversation_id)
    OR public.is_admin()
  )
);

CREATE POLICY rentpe_messages_update_own
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
  OR public.is_conversation_participant(conversation_id)
  OR public.is_admin()
)
WITH CHECK (
  sender_id = auth.uid()
  OR public.is_conversation_participant(conversation_id)
  OR public.is_admin()
);

-- =============================================================================
-- reviews
-- =============================================================================

CREATE POLICY rentpe_reviews_select_public
ON public.reviews
FOR SELECT
TO public
USING (true);

CREATE POLICY rentpe_reviews_insert_own
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = auth.uid()
  AND public.is_rental_party(rental_id)
);

CREATE POLICY rentpe_reviews_update_own
ON public.reviews
FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid() OR public.is_admin())
WITH CHECK (reviewer_id = auth.uid() OR public.is_admin());

-- =============================================================================
-- wishlists
-- =============================================================================

CREATE POLICY rentpe_wishlists_select_own
ON public.wishlists
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY rentpe_wishlists_insert_own
ON public.wishlists
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY rentpe_wishlists_delete_own
ON public.wishlists
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- =============================================================================
-- notifications
-- =============================================================================

CREATE POLICY rentpe_notifications_select_own
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY rentpe_notifications_update_own
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Inserts via service role / server only (no INSERT policy for JWT).

-- =============================================================================
-- reports
-- =============================================================================

CREATE POLICY rentpe_reports_select_own_or_admin
ON public.reports
FOR SELECT
TO authenticated
USING (reporter_id = auth.uid() OR public.is_admin());

CREATE POLICY rentpe_reports_insert_own
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY rentpe_reports_update_admin
ON public.reports
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =============================================================================
-- audit_logs
-- Append-only; admin read; writes via service role only.
-- =============================================================================

CREATE POLICY rentpe_audit_logs_admin_select
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());
