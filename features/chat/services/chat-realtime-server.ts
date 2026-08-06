import type { ChatMessageView } from "@/features/chat/types/chat";
import { postSupabaseBroadcast } from "@/lib/realtime/supabase-broadcast";

/**
 * Deliver a committed chat message to peer clients immediately (HTTP broadcast).
 * Complements client fanout; peers should not wait for the sender tab.
 */
export async function broadcastChatMessage(params: {
  peerId: string;
  conversationId: string;
  message: ChatMessageView;
  senderName: string;
}): Promise<void> {
  const payload = {
    message: params.message,
    senderName: params.senderName,
  };

  await postSupabaseBroadcast([
    {
      topic: `chat-user:${params.peerId}`,
      event: "message",
      payload,
    },
    {
      topic: `chat-rt:${params.conversationId}`,
      event: "message",
      payload,
    },
  ]);
}
