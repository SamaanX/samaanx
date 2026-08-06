-- Soft delete for chat messages (delete for everyone)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_for_everyone_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_deleted_for_everyone
  ON messages (conversation_id, deleted_for_everyone_at)
  WHERE deleted_for_everyone_at IS NOT NULL;
