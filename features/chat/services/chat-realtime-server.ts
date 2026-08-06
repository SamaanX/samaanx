import { after } from "next/server";

import type { ChatMessageView } from "@/features/chat/types/chat";
import { postSupabaseBroadcast } from "@/lib/realtime/supabase-broadcast";

export type ChatBroadcastResult = {
  ok: boolean;
  latencyMs: number;
};

function scheduleChatBroadcast(
  messages: Array<{ topic: string; event: string; payload: unknown }>,
): void {
  after(async () => {
    await postSupabaseBroadcast(messages);
  });
}

/** Deliver a committed chat message to peer clients (non-blocking for the action response). */
export function scheduleChatMessageBroadcast(params: {
  peerId: string;
  conversationId: string;
  message: ChatMessageView;
  senderName: string;
}): void {
  const payload = {
    message: params.message,
    senderName: params.senderName,
  };

  scheduleChatBroadcast([
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

export function scheduleChatDeleteBroadcast(params: {
  peerId?: string | null;
  conversationId: string;
  messageId: string;
  scope: "me" | "everyone";
  byUserId: string;
}): void {
  const payload = {
    messageId: params.messageId,
    conversationId: params.conversationId,
    scope: params.scope,
    byUserId: params.byUserId,
  };

  const messages: Array<{ topic: string; event: string; payload: unknown }> =
    [];

  if (params.scope === "me") {
    messages.push({
      topic: `chat-user:${params.byUserId}`,
      event: "delete",
      payload,
    });
  } else {
    if (params.peerId) {
      messages.push({
        topic: `chat-user:${params.peerId}`,
        event: "delete",
        payload,
      });
    }
    messages.push({
      topic: `chat-rt:${params.conversationId}`,
      event: "delete",
      payload,
    });
  }

  scheduleChatBroadcast(messages);
}

/** @deprecated Use scheduleChatMessageBroadcast */
export async function broadcastChatMessage(params: {
  peerId: string;
  conversationId: string;
  message: ChatMessageView;
  senderName: string;
}): Promise<ChatBroadcastResult> {
  scheduleChatMessageBroadcast(params);
  return { ok: true, latencyMs: 0 };
}
