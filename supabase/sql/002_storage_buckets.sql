-- =============================================================================
-- SamaanX — 002_storage_buckets.sql
-- Create Storage buckets. Do not upload files in this phase.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'listing-images',
    'listing-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']::text[]
  ),
  (
    'avatars',
    'avatars',
    true,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
  ),
  (
    'verification-assets',
    'verification-assets',
    false,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/octet-stream']::text[]
  ),
  (
    'documents',
    'documents',
    false,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'chat-media',
    'chat-media',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'video/mp4', 'application/pdf']::text[]
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
