-- Phase 15 — Performance sprint indexes (apply after 010–014)
-- Partial / composite indexes for hot marketplace, rental, chat, and job paths.

-- Home + search: active listings sorted by publish time
CREATE INDEX IF NOT EXISTS listings_active_published_idx
  ON public.listings (published_at DESC NULLS LAST, created_at DESC)
  WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- Home popular rail: view/request ranking on active listings
CREATE INDEX IF NOT EXISTS listings_active_popularity_idx
  ON public.listings (view_count DESC, request_count DESC, published_at DESC)
  WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- Rental date overlap checks on holding statuses
CREATE INDEX IF NOT EXISTS rentals_listing_holding_dates_idx
  ON public.rentals (listing_id, status, start_date, end_date);

-- Chat: unread messages in a conversation (inbox badges)
CREATE INDEX IF NOT EXISTS messages_conversation_unread_idx
  ON public.messages (conversation_id, created_at DESC)
  WHERE read_at IS NULL;

-- Notifications: unread in-app feed
CREATE INDEX IF NOT EXISTS notifications_user_unread_inapp_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE channel = 'IN_APP' AND read_at IS NULL AND deleted_at IS NULL;

-- Scheduled jobs: worker pickup (status, run_at) already exists — skip duplicate
