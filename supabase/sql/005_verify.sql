-- Verification queries for Phase 1C-B
SELECT id, public FROM storage.buckets
WHERE id IN ('listing-images','avatars','verification-assets','documents','chat-media')
ORDER BY id;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'profiles','categories','listings','listing_images','listing_availability',
    'rentals','rental_verifications','rental_confirmations','conversations',
    'messages','reviews','wishlists','notifications','reports','audit_logs'
  )
ORDER BY c.relname;

SELECT COUNT(*) AS rentpe_table_policies
FROM pg_policies
WHERE schemaname = 'public' AND policyname LIKE 'rentpe_%';

SELECT COUNT(*) AS rentpe_storage_policies
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'rentpe_%';
