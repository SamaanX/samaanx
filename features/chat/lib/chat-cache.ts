import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { messageStatus } from "@/features/chat/services/mappers";
import { previewFromMessage } from "@/features/chat/services/mappers";
import type {
  ChatConversationListItem,
  ChatMessagesPage,
  ChatMessageView,
  ChatThreadHeader,
} from "@/features/chat/types/chat";
import { queryKeys } from "@/lib/query-keys";

type MessagesInfinite = InfiniteData<ChatMessagesPage, string | null>;

export function patchAppendMessage(
  queryClient: QueryClient,
  conversationId: string,
  message: ChatMessageView,
): void {
  queryClient.setQueryData<MessagesInfinite>(
    queryKeys.chat.messages(conversationId),
    (prev) => {
      if (!prev?.pages?.length) {
        return {
          pages: [{ messages: [message], nextCursor: null }],
          pageParams: [null],
        };
      }
      const exists = prev.pages.some((p) =>
        p.messages.some((m) => m.id === message.id),
      );
      if (exists) return prev;

      // Drop matching optimistic temp message from same sender+body if any
      const pages = prev.pages.map((page, index) => {
        let messages = page.messages.filter(
          (m) =>
            !(
              m.optimistic &&
              m.senderId === message.senderId &&
              m.body === message.body
            ),
        );
        if (index === 0) {
          messages = [...messages, message];
        }
        return { ...page, messages };
      });
      return { ...prev, pages };
    },
  );
}

export function patchReplaceOptimistic(
  queryClient: QueryClient,
  conversationId: string,
  clientId: string,
  message: ChatMessageView,
): void {
  queryClient.setQueryData<MessagesInfinite>(
    queryKeys.chat.messages(conversationId),
    (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((page) => ({
          ...page,
          messages: page.messages.map((m) => (m.id === clientId ? message : m)),
        })),
      };
    },
  );
}

export function patchMessageReceipts(
  queryClient: QueryClient,
  conversationId: string,
  params: {
    messageIds?: string[];
    /** If true, apply to all of my messages in the thread */
    allMine?: boolean;
    viewerId: string;
    deliveredAt?: string | null;
    readAt?: string | null;
  },
): void {
  const idSet = params.messageIds ? new Set(params.messageIds) : null;

  queryClient.setQueryData<MessagesInfinite>(
    queryKeys.chat.messages(conversationId),
    (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((page) => ({
          ...page,
          messages: page.messages.map((m) => {
            if (!m.isMine || m.senderId !== params.viewerId) return m;
            if (idSet && !idSet.has(m.id)) return m;
            if (!idSet && !params.allMine) return m;

            const deliveredAt =
              params.deliveredAt !== undefined
                ? (params.deliveredAt ?? m.deliveredAt)
                : m.deliveredAt;
            const readAt =
              params.readAt !== undefined
                ? (params.readAt ?? m.readAt)
                : m.readAt;

            return {
              ...m,
              deliveredAt,
              readAt,
              status: messageStatus({
                isMine: true,
                deliveredAt: deliveredAt ? new Date(deliveredAt) : null,
                readAt: readAt ? new Date(readAt) : null,
              }),
              optimistic: false,
            };
          }),
        })),
      };
    },
  );
}

/** Stamp delivered/read on peer messages in the local cache (receiver side). */
export function patchIncomingMessageTimestamps(
  queryClient: QueryClient,
  conversationId: string,
  params: {
    messageIds: string[];
    deliveredAt?: string | null;
    readAt?: string | null;
  },
): void {
  const idSet = new Set(params.messageIds);
  queryClient.setQueryData<MessagesInfinite>(
    queryKeys.chat.messages(conversationId),
    (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((page) => ({
          ...page,
          messages: page.messages.map((m) => {
            if (m.isMine || !idSet.has(m.id)) return m;
            return {
              ...m,
              deliveredAt:
                params.deliveredAt !== undefined
                  ? (params.deliveredAt ?? m.deliveredAt)
                  : m.deliveredAt,
              readAt:
                params.readAt !== undefined
                  ? (params.readAt ?? m.readAt)
                  : m.readAt,
            };
          }),
        })),
      };
    },
  );
}

export function patchInboxPreview(
  queryClient: QueryClient,
  conversationId: string,
  message: ChatMessageView,
  opts?: { clearUnread?: boolean; bumpUnread?: boolean },
): void {
  queryClient.setQueryData<ChatConversationListItem[]>(
    queryKeys.chat.inbox(),
    (prev) => {
      if (!prev) return prev;
      return prev
        .map((c) => {
          if (c.id !== conversationId) return c;
          let unread = c.unreadCount;
          if (opts?.clearUnread) unread = 0;
          else if (opts?.bumpUnread && !message.isMine) unread += 1;
          return {
            ...c,
            lastMessageAt: message.createdAt,
            lastMessagePreview: previewFromMessage({
              body: message.body,
              attachmentKind: message.attachment?.kind ?? null,
              attachmentName: message.attachment?.name ?? null,
            }),
            unreadCount: unread,
          };
        })
        .sort((a, b) => {
          const at = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
          const bt = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
          return bt - at;
        });
    },
  );

  syncChatUnreadTotal(queryClient);
}

export function syncChatUnreadTotal(queryClient: QueryClient): void {
  const inbox = queryClient.getQueryData<ChatConversationListItem[]>(
    queryKeys.chat.inbox(),
  );
  if (!inbox) return;
  const total = inbox.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  queryClient.setQueryData<number>(queryKeys.chat.unreadTotal(), total);
}

export function bumpChatUnreadTotal(queryClient: QueryClient, delta = 1): void {
  queryClient.setQueryData<number>(queryKeys.chat.unreadTotal(), (prev) =>
    Math.max(0, (prev ?? 0) + delta),
  );
}

export function patchRemoveMessage(
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
): void {
  queryClient.setQueryData<MessagesInfinite>(
    queryKeys.chat.messages(conversationId),
    (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((page) => ({
          ...page,
          messages: page.messages.filter((m) => m.id !== messageId),
        })),
      };
    },
  );
}

export function patchMessageDeletedForEveryone(
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
): void {
  queryClient.setQueryData<MessagesInfinite>(
    queryKeys.chat.messages(conversationId),
    (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((page) => ({
          ...page,
          messages: page.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  body: "",
                  attachment: null,
                  replyTo: null,
                  deletedForEveryone: true,
                }
              : m,
          ),
        })),
      };
    },
  );
}

export function patchHeaderPeerLastSeen(
  queryClient: QueryClient,
  conversationId: string,
  lastSeenAt: string,
): void {
  queryClient.setQueryData<ChatThreadHeader>(
    [...queryKeys.chat.thread(conversationId), "header"],
    (prev) =>
      prev
        ? {
            ...prev,
            peer: { ...prev.peer, lastSeenAt },
          }
        : prev,
  );
}
