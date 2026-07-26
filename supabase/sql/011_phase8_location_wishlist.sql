-- Phase 8: exact-pickup toggle (default OFF = approximate public pin).
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS show_exact_pickup boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.show_exact_pickup IS
  'When true, public buyers see exact pickup coords. Default false = ~400m approximate.';
