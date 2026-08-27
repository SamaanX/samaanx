"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import {
  deleteChatMessageForEveryoneAction,
  getChatInboxAction,
  getChatThreadAction,
  getChatUnreadTotalAction,
  hideChatMessageAction,
  listChatMessagesAction,
  markChatMessagesDeliveredAction,
  markChatMessagesReadAction,
  sendChatAttachmentAction,
  sendChatTextMessageAction,
} from "@/features/chat/actions/chat-actions";
import {
  bumpChatUnreadTotal,
  patchAppendMessage,
  patchHeaderPeerLastSeen,
  patchInboxPreview,
  patchIncomingMessageTimestamps,
  patchMessageDeletedForEveryone,
  patchMessageReceipts,
  patchRemoveMessage,
  patchReplaceOptimistic,
  syncChatUnreadTotal,
} from "@/features/chat/lib/chat-cache";
import { showChatMessageToast } from "@/features/chat/services/chat-toast";
import { previewFromMessage } from "@/features/chat/services/mappers";
import { chatMessageViewFromPostgresRow } from "@/features/chat/services/postgres-message";
import type {
  ChatConversationListItem,
  ChatMessagesPage,
  ChatMessageView,
  ChatReplyPreview,
  ChatThreadHeader,
} from "@/features/chat/types/chat";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";
import {
  usePresenceOnline,
  usePresenceOnlineIds,
} from "@/providers/presence-host";

export { usePresenceOnline, usePresenceOnlineIds };

type ReceiptPayload = {
  type: "delivered" | "seen";
  conversationId: string;
  messageIds: string[];
  at: string;
  byUserId: string;
};

type MessagePayload = {
  message: ChatMessageView;
  senderName?: string;
};

type DeletePayload = {
  messageId: string;
  conversationId: string;
  scope: "me" | "everyone";
  byUserId: string;
};

function applyDelete(
  queryClient: ReturnType<typeof useQueryClient>,
  viewerId: string,
  payload: DeletePayload,
) {
  if (payload.scope === "everyone") {
    patchMessageDeletedForEveryone(
      queryClient,
      payload.conversationId,
      payload.messageId,
    );
    return;
  }
  if (payload.byUserId !== viewerId) return;
  patchRemoveMessage(queryClient, payload.conversationId, payload.messageId);
}

async function sendBroadcast(
  channel: RealtimeChannel | null,
  event: "message" | "receipt",
  payload: MessagePayload | ReceiptPayload,
) {
  if (!channel) return false;
  for (let i = 0; i < 4; i += 1) {
    const status = await channel.send({
      type: "broadcast",
      event,
      payload,
    });
    if (status === "ok") return true;
    await new Promise((r) => setTimeout(r, 40));
  }
  return false;
}

/** Join a user channel briefly to push an event (delivery/seen fanout). */
async function publishToUserChannel(
  userId: string,
  event: "message" | "receipt",
  payload: MessagePayload | ReceiptPayload,
) {
  const supabase = createClient();
  const channel = supabase.channel(`chat-user:${userId}`);
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      void supabase.removeChannel(channel);
      resolve();
    };
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await sendBroadcast(channel, event, payload);
        finish();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        finish();
      }
    });
    window.setTimeout(finish, 2500);
  });
}

function toLiveMessageView(
  message: ChatMessageView,
  viewerId: string,
): ChatMessageView {
  const isMine = message.senderId === viewerId;
  return {
    ...message,
    isMine,
    status: isMine
      ? message.readAt
        ? "seen"
        : message.deliveredAt
          ? "delivered"
          : "sent"
      : "sent",
    optimistic: false,
  };
}

function applyIncomingMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  viewerId: string,
  message: ChatMessageView,
  source: "broadcast" | "postgres" = "broadcast",
) {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_PERF_CHAT === "1"
  ) {
    console.warn(
      JSON.stringify({
        level: "debug",
        message: "chat.receive",
        source,
        messageId: message.id,
        at: new Date().toISOString(),
      }),
    );
  }

  const view = toLiveMessageView(message, viewerId);
  const conversationId = view.conversationId;
  const hadInbox = Boolean(queryClient.getQueryData(queryKeys.chat.inbox()));

  patchAppendMessage(queryClient, conversationId, view);
  patchInboxPreview(queryClient, conversationId, view, {
    clearUnread: view.isMine,
    bumpUnread: !view.isMine,
  });

  // Inbox may not be loaded on home — still bump the header chat badge.
  if (!view.isMine && !hadInbox) {
    bumpChatUnreadTotal(queryClient, 1);
  }

  return view;
}

/** Instant delivered tick for the sender; DB persist is fire-and-forget. */
function ackDeliveredAndNotify(params: {
  queryClient: ReturnType<typeof useQueryClient>;
  conversationId: string;
  messageIds: string[];
  byUserId: string;
  threadChannel: RealtimeChannel | null;
  senderUserId?: string | null;
}) {
  if (params.messageIds.length === 0) return;

  const at = new Date().toISOString();
  patchIncomingMessageTimestamps(params.queryClient, params.conversationId, {
    messageIds: params.messageIds,
    deliveredAt: at,
  });

  const receipt: ReceiptPayload = {
    type: "delivered",
    conversationId: params.conversationId,
    messageIds: params.messageIds,
    at,
    byUserId: params.byUserId,
  };

  void sendBroadcast(params.threadChannel, "receipt", receipt);
  if (params.senderUserId && params.senderUserId !== params.byUserId) {
    void publishToUserChannel(params.senderUserId, "receipt", receipt);
  }

  void markChatMessagesDeliveredAction({
    conversationId: params.conversationId,
    messageIds: params.messageIds,
  });
}

function applyReceipt(
  queryClient: ReturnType<typeof useQueryClient>,
  viewerId: string,
  receipt: ReceiptPayload,
) {
  if (!receipt.messageIds?.length) return;
  if (receipt.byUserId === viewerId) return;

  if (receipt.type === "delivered") {
    patchMessageReceipts(queryClient, receipt.conversationId, {
      messageIds: receipt.messageIds,
      viewerId,
      deliveredAt: receipt.at,
    });
  } else {
    patchMessageReceipts(queryClient, receipt.conversationId, {
      messageIds: receipt.messageIds,
      viewerId,
      deliveredAt: receipt.at,
      readAt: receipt.at,
    });
  }
}

export function useChatInbox(initial: ChatConversationListItem[]) {
  return useQuery({
    queryKey: queryKeys.chat.inbox(),
    queryFn: async () => {
      const result = await getChatInboxAction();
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    initialData: initial,
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  });
}

/** App-wide chat realtime: live messages, delivered ticks, priority toasts. */
export function useChatUserRealtime(
  userId: string | null,
  options?: {
    showToasts?: boolean;
    pathname?: string | null;
    navigate?: (href: string) => void;
  },
) {
  const queryClient = useQueryClient();
  const showToasts = options?.showToasts ?? false;
  const pathname = options?.pathname ?? "";
  const navigate = options?.navigate;
  const pathnameRef = React.useRef(pathname);
  const navigateRef = React.useRef(navigate);
  pathnameRef.current = pathname ?? "";
  navigateRef.current = navigate;

  React.useEffect(() => {
    if (!userId) return;

    void getChatUnreadTotalAction().then((result) => {
      if (result.ok) {
        queryClient.setQueryData(queryKeys.chat.unreadTotal(), result.data);
      }
    });

    const supabase = createClient();
    const channel = supabase.channel(`chat-user:${userId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      const message = (payload as MessagePayload | undefined)?.message;
      if (!message?.id || message.senderId === userId) return;

      const view = applyIncomingMessage(queryClient, userId, message);

      ackDeliveredAndNotify({
        queryClient,
        conversationId: view.conversationId,
        messageIds: [view.id],
        byUserId: userId,
        threadChannel: null,
        senderUserId: view.senderId,
      });

      if (showToasts && navigateRef.current) {
        const onThread = pathnameRef.current === `/chat/${view.conversationId}`;
        if (!onThread) {
          const inbox = queryClient.getQueryData<ChatConversationListItem[]>(
            queryKeys.chat.inbox(),
          );
          const peerName =
            (payload as MessagePayload).senderName ||
            inbox?.find((c) => c.id === view.conversationId)?.peer
              .displayName ||
            "Someone";
          showChatMessageToast({
            conversationId: view.conversationId,
            messageId: view.id,
            senderName: peerName,
            preview: previewFromMessage({
              body: view.body,
              attachmentKind: view.attachment?.kind ?? null,
              attachmentName: view.attachment?.name ?? null,
            }),
            navigate: navigateRef.current,
          });
        }
      }
    });

    channel.on("broadcast", { event: "receipt" }, ({ payload }) => {
      const receipt = payload as ReceiptPayload | undefined;
      if (!receipt) return;
      applyReceipt(queryClient, userId, receipt);
    });

    channel.on("broadcast", { event: "delete" }, ({ payload }) => {
      const del = payload as DeletePayload | undefined;
      if (!del?.messageId || !del.conversationId) return;
      applyDelete(queryClient, userId, del);
    });

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversations" },
      () => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.chat.inbox(),
          refetchType: "active",
        });
        void getChatUnreadTotalAction().then((result) => {
          if (result.ok) {
            queryClient.setQueryData(queryKeys.chat.unreadTotal(), result.data);
          }
        });
      },
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId, showToasts]);
}
export function useChatThread(params: {
  conversationId: string | null;
  initialHeader?: ChatThreadHeader | null;
  initialPage?: ChatMessagesPage | null;
  userId: string;
  myName?: string;
}) {
  const { conversationId, userId } = params;
  const myName = params.myName?.trim() || "Someone";
  const queryClient = useQueryClient();
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const peerFanoutRef = React.useRef<RealtimeChannel | null>(null);
  const peerId = params.initialHeader?.peer.id ?? null;

  const headerQuery = useQuery({
    queryKey: conversationId
      ? [...queryKeys.chat.thread(conversationId), "header"]
      : ["chat", "thread", "none"],
    enabled: Boolean(conversationId),
    queryFn: async () => {
      const result = await getChatThreadAction(conversationId!);
      if (!result.ok) throw new Error(result.error.message);
      return result.data.header;
    },
    initialData: params.initialHeader ?? undefined,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const livePeerId = headerQuery.data?.peer.id ?? peerId;
  const peerOnline = usePresenceOnline(livePeerId);

  React.useEffect(() => {
    if (peerOnline || !livePeerId || !conversationId) return;
    void headerQuery.refetch().then((result) => {
      const lastSeen = result.data?.peer.lastSeenAt;
      if (lastSeen) {
        patchHeaderPeerLastSeen(queryClient, conversationId, lastSeen);
      }
    });
  }, [peerOnline, livePeerId, conversationId, headerQuery, queryClient]);

  React.useEffect(() => {
    if (!livePeerId) return;
    const supabase = createClient();
    const channel = supabase.channel(`chat-user:${livePeerId}`, {
      config: { broadcast: { self: false } },
    });
    peerFanoutRef.current = channel;
    channel.subscribe();
    return () => {
      peerFanoutRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [livePeerId]);

  const messagesQuery = useInfiniteQuery({
    queryKey: conversationId
      ? queryKeys.chat.messages(conversationId)
      : ["chat", "messages", "none"],
    enabled: Boolean(conversationId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const result = await listChatMessagesAction({
        conversationId,
        cursor: pageParam,
      });
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    getNextPageParam: (last) => last.nextCursor,
    initialData:
      conversationId && params.initialPage
        ? {
            pages: [params.initialPage],
            pageParams: [null],
          }
        : undefined,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const messages = React.useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    const merged: ChatMessageView[] = [];
    for (let i = pages.length - 1; i >= 0; i -= 1) {
      merged.push(...(pages[i]?.messages ?? []));
    }
    const seen = new Set<string>();
    return merged.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messagesQuery.data?.pages]);

  React.useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase.channel(`chat-rt:${conversationId}`, {
      config: { broadcast: { self: true } },
    });

    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      const message = (payload as MessagePayload | undefined)?.message;
      if (!message?.id) return;

      const view = applyIncomingMessage(queryClient, userId, message);
      if (view.isMine) return;

      void ackDeliveredAndNotify({
        queryClient,
        conversationId,
        messageIds: [view.id],
        byUserId: userId,
        threadChannel: channelRef.current,
        senderUserId: view.senderId,
      });
    });

    channel.on("broadcast", { event: "receipt" }, ({ payload }) => {
      const receipt = payload as ReceiptPayload | undefined;
      if (!receipt) return;
      applyReceipt(queryClient, userId, {
        ...receipt,
        conversationId: receipt.conversationId || conversationId,
      });
    });

    channel.on("broadcast", { event: "delete" }, ({ payload }) => {
      const del = payload as DeletePayload | undefined;
      if (!del?.messageId) return;
      applyDelete(queryClient, userId, {
        ...del,
        conversationId: del.conversationId || conversationId,
      });
    });

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        const message = chatMessageViewFromPostgresRow(row, userId);
        if (!message) return;

        const view = applyIncomingMessage(
          queryClient,
          userId,
          message,
          "postgres",
        );
        if (view.isMine) return;

        void ackDeliveredAndNotify({
          queryClient,
          conversationId,
          messageIds: [view.id],
          byUserId: userId,
          threadChannel: channelRef.current,
          senderUserId: view.senderId,
        });
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        const id = typeof row.id === "string" ? row.id : null;
        if (!id) return;
        patchMessageReceipts(queryClient, conversationId, {
          messageIds: [id],
          viewerId: userId,
          deliveredAt:
            typeof row.delivered_at === "string" ? row.delivered_at : null,
          readAt: typeof row.read_at === "string" ? row.read_at : null,
        });
      },
    );

    channelRef.current = channel;
    channel.subscribe();

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, userId]);

  const undeliveredKey = messages
    .filter((m) => !m.isMine && !m.deliveredAt)
    .map((m) => m.id)
    .join(",");

  React.useEffect(() => {
    if (!conversationId || !undeliveredKey) return;
    const ids = undeliveredKey.split(",");
    void ackDeliveredAndNotify({
      queryClient,
      conversationId,
      messageIds: ids,
      byUserId: userId,
      threadChannel: channelRef.current,
      senderUserId: messages.find((m) => ids.includes(m.id))?.senderId ?? null,
    });
  }, [conversationId, undeliveredKey, userId, messages, queryClient]);

  const unreadKey = messages
    .filter((m) => !m.isMine && !m.readAt)
    .map((m) => m.id)
    .join(",");

  React.useEffect(() => {
    if (!conversationId || !unreadKey) return;
    const ids = unreadKey.split(",");
    const at = new Date().toISOString();

    // Optimistic seen stamp + instant blue ticks for sender
    patchIncomingMessageTimestamps(queryClient, conversationId, {
      messageIds: ids,
      deliveredAt: at,
      readAt: at,
    });

    const senderIds = new Set(
      messages.filter((m) => ids.includes(m.id)).map((m) => m.senderId),
    );
    const receipt: ReceiptPayload = {
      type: "seen",
      conversationId,
      messageIds: ids,
      at,
      byUserId: userId,
    };
    void sendBroadcast(channelRef.current, "receipt", receipt);
    for (const senderId of senderIds) {
      if (senderId === userId) continue;
      void publishToUserChannel(senderId, "receipt", receipt);
    }

    queryClient.setQueryData<ChatConversationListItem[]>(
      queryKeys.chat.inbox(),
      (prev) =>
        prev?.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
    );
    syncChatUnreadTotal(queryClient);

    void markChatMessagesReadAction({ conversationId });
  }, [conversationId, unreadKey, queryClient, userId, messages]);

  async function fanoutMessage(confirmed: ChatMessageView) {
    const payload: MessagePayload = {
      message: confirmed,
      senderName: myName,
    };
    await Promise.all([
      sendBroadcast(channelRef.current, "message", payload),
      sendBroadcast(peerFanoutRef.current, "message", payload),
    ]);
  }

  async function sendText(
    body: string,
    replyToId?: string | null,
    replyPreview?: ChatReplyPreview | null,
  ) {
    if (!conversationId)
      return { ok: false as const, error: "No conversation" };
    const clientId = `tmp-${crypto.randomUUID()}`;
    const optimistic: ChatMessageView = {
      id: clientId,
      conversationId,
      senderId: userId,
      body,
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null,
      status: "sent",
      isMine: true,
      attachment: null,
      replyTo: replyPreview ?? null,
      optimistic: true,
    };

    patchAppendMessage(queryClient, conversationId, optimistic);
    patchInboxPreview(queryClient, conversationId, optimistic, {
      clearUnread: true,
    });

    void fanoutMessage(optimistic);

    const clickAt = Date.now();
    if (typeof performance !== "undefined") {
      performance.mark("chat-send-click");
    }

    void (async () => {
      const result = await sendChatTextMessageAction({
        conversationId,
        body,
        replyToId,
        clientId,
      });

      if (!result.ok) {
        patchRemoveMessage(queryClient, conversationId, clientId);
        toast.error(result.error.message ?? "Message failed to send.");
        void queryClient.invalidateQueries({
          queryKey: queryKeys.chat.messages(conversationId),
        });
        return;
      }

      const confirmed: ChatMessageView = {
        ...result.data,
        status: "sent",
        optimistic: false,
      };
      patchReplaceOptimistic(queryClient, conversationId, clientId, confirmed);
      patchInboxPreview(queryClient, conversationId, confirmed, {
        clearUnread: true,
      });

      if (typeof performance !== "undefined") {
        performance.mark("chat-send-response");
        performance.measure(
          "chat-send-action-ms",
          "chat-send-click",
          "chat-send-response",
        );
      }

      if (
        process.env.NODE_ENV === "development" ||
        process.env.NEXT_PUBLIC_PERF_CHAT === "1"
      ) {
        console.warn(
          JSON.stringify({
            level: "debug",
            message: "chat.send.client",
            actionMs: Date.now() - clickAt,
            at: new Date().toISOString(),
          }),
        );
      }

      void fanoutMessage(confirmed);
    })();

    return { ok: true as const, data: optimistic };
  }

  async function sendAttachment(
    file: File,
    body = "",
    replyToId?: string | null,
  ) {
    if (!conversationId)
      return { ok: false as const, error: "No conversation" };
    const form = new FormData();
    form.set("conversationId", conversationId);
    form.set("body", body);
    if (replyToId) form.set("replyToId", replyToId);
    form.set("file", file);
    const result = await sendChatAttachmentAction(form);
    if (result.ok) {
      const confirmed: ChatMessageView = {
        ...result.data,
        status: "sent",
        optimistic: false,
      };
      patchAppendMessage(queryClient, conversationId, confirmed);
      patchInboxPreview(queryClient, conversationId, confirmed, {
        clearUnread: true,
      });
      void fanoutMessage(confirmed);
    }
    return result;
  }

  async function hideMessage(messageId: string) {
    if (!conversationId) {
      return {
        ok: false as const,
        error: { message: "No conversation", code: "INTERNAL" as const },
      };
    }
    patchRemoveMessage(queryClient, conversationId, messageId);
    const result = await hideChatMessageAction({ messageId });
    if (!result.ok) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(conversationId),
      });
    }
    return result;
  }

  async function deleteForEveryone(messageId: string) {
    if (!conversationId) {
      return {
        ok: false as const,
        error: { message: "No conversation", code: "INTERNAL" as const },
      };
    }
    patchMessageDeletedForEveryone(queryClient, conversationId, messageId);
    const result = await deleteChatMessageForEveryoneAction({ messageId });
    if (!result.ok) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(conversationId),
      });
    }
    return result;
  }

  return {
    header: headerQuery.data ?? params.initialHeader ?? null,
    messages,
    messagesQuery,
    sendText,
    sendAttachment,
    hideMessage,
    deleteForEveryone,
    peerOnline,
  };
}

export function useChatTyping(params: {
  conversationId: string | null;
  userId: string;
  displayName: string;
}) {
  const [peerTypingName, setPeerTypingName] = React.useState<string | null>(
    null,
  );
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const stopTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!params.conversationId) return;
    const supabase = createClient();
    const channel = supabase.channel(`typing:${params.conversationId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      const name =
        payload && typeof payload === "object"
          ? (payload as { name?: string; userId?: string }).name
          : null;
      const fromId =
        payload && typeof payload === "object"
          ? (payload as { userId?: string }).userId
          : null;
      if (!name || fromId === params.userId) return;
      setPeerTypingName(name);
      if (stopTimer.current) clearTimeout(stopTimer.current);
      stopTimer.current = setTimeout(() => setPeerTypingName(null), 2500);
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [params.conversationId, params.userId]);

  const notifyTyping = React.useCallback(() => {
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: params.userId, name: params.displayName },
    });
  }, [params.displayName, params.userId]);

  return { peerTypingName, notifyTyping };
}
