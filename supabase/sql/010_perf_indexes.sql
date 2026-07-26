-- Hot-path indexes for activity banners, seller listings, unread, notifications.
-- Apply in Supabase SQL editor or via prisma db push after schema.prisma update.

CREATE INDEX IF NOT EXISTS rentals_buyer_id_status_updated_at_idx
  ON public.rentals (buyer_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS rentals_seller_id_status_updated_at_idx
  ON public.rentals (seller_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS listings_seller_id_deleted_at_created_at_idx
  ON public.listings (seller_id, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_conversation_id_read_at_idx
  ON public.messages (conversation_id, read_at);

CREATE INDEX IF NOT EXISTS notifications_user_id_channel_read_at_idx
  ON public.notifications (user_id, channel, read_at);
