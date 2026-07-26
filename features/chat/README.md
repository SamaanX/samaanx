# Chat (Phase 6)

Production messaging tied to rentals.

- Inbox: `/chat`
- Thread: `/chat/[id]`
- Realtime: Supabase `messages` / `conversations` + Presence + typing broadcast
- Attachments: private `chat-media` bucket
- Read-only when rental is rejected/cancelled
