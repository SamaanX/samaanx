-- Phase 13: supplementary indexes from query-pattern audit
-- Run in Supabase SQL editor after 010/015/020/021/022

-- Wishlist overlay batch lookups (listingId IN (...))
CREATE INDEX IF NOT EXISTS idx_wishlist_user_listing
  ON wishlists (user_id, listing_id);

-- Seller listings dashboard (seller_id + status, ordered by updated)
CREATE INDEX IF NOT EXISTS idx_listings_seller_status_updated
  ON listings (seller_id, status, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Announcement dismissals: join without loading all user dismissals
CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_user_ann
  ON announcement_dismissals (user_id, announcement_id);

-- Chat inbox sort by last activity for buyer/seller
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_last_message
  ON conversations (buyer_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conversations_seller_last_message
  ON conversations (seller_id, last_message_at DESC NULLS LAST);
