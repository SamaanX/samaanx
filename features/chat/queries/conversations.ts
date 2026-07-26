import { CHAT_MESSAGES_PAGE_SIZE } from "@/features/chat/schemas/chat";
import {
  previewFromMessage,
  toChatMessageView,
  toConversationListItem,
  toThreadHeader,
} from "@/features/chat/services/mappers";
import type {
  ChatConversationListItem,
  ChatMessagesPage,
  ChatThreadHeader,
} from "@/features/chat/types/chat";
import { prisma } from "@/lib/db/prisma";

const messageInclude = {
  sender: { select: { id: true, displayName: true, avatarUrl: true } },
  replyTo: {
    select: {
      id: true,
      body: true,
      attachmentKind: true,
      attachmentName: true,
      sender: { select: { displayName: true } },
    },
  },
} as const;

export async function listConversationsForUser(
  userId: string,
): Promise<ChatConversationListItem[]> {
  const rows = await prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      rentalId: true,
      buyerId: true,
      sellerId: true,
      isReadonly: true,
      lastMessageAt: true,
      buyer: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          lastSeenAt: true,
        },
      },
      seller: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          lastSeenAt: true,
        },
      },
      rental: {
        select: {
          status: true,
          listing: {
            select: {
              id: true,
              slug: true,
              title: true,
              images: {
                select: { url: true },
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
            },
          },
        },
      },
      messages: {
        where: {
          hides: { none: { userId } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          attachmentKind: true,
          attachmentName: true,
          senderId: true,
          readAt: true,
          createdAt: true,
        },
      },
    },
  });

  const unreadGroups = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: rows.map((r) => r.id) },
      senderId: { not: userId },
      readAt: null,
      hides: { none: { userId } },
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(
    unreadGroups.map((g) => [g.conversationId, g._count._all]),
  );

  return rows.map((row) => {
    const isBuyer = row.buyerId === userId;
    const peer = isBuyer ? row.seller : row.buyer;
    const last = row.messages[0] ?? null;
    return toConversationListItem({
      id: row.id,
      rentalId: row.rentalId,
      rentalStatus: row.rental.status,
      isReadonly: row.isReadonly,
      lastMessageAt: row.lastMessageAt ?? last?.createdAt ?? null,
      lastMessagePreview: last
        ? previewFromMessage({
            body: last.body,
            attachmentKind: last.attachmentKind,
            attachmentName: last.attachmentName,
          })
        : null,
      unreadCount: unreadMap.get(row.id) ?? 0,
      peer,
      listing: {
        id: row.rental.listing.id,
        slug: row.rental.listing.slug,
        title: row.rental.listing.title,
        coverImageUrl: row.rental.listing.images[0]?.url ?? null,
      },
    });
  });
}

export async function getConversationThreadHeader(
  conversationId: string,
  userId: string,
): Promise<ChatThreadHeader | null> {
  const row = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    select: {
      id: true,
      rentalId: true,
      buyerId: true,
      sellerId: true,
      isReadonly: true,
      buyer: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          lastSeenAt: true,
        },
      },
      seller: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          lastSeenAt: true,
        },
      },
      rental: {
        select: {
          status: true,
          startDate: true,
          endDate: true,
          listing: {
            select: {
              id: true,
              slug: true,
              title: true,
              images: {
                select: { url: true },
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!row) return null;
  const viewerRole = row.buyerId === userId ? "buyer" : "seller";
  const peer = viewerRole === "buyer" ? row.seller : row.buyer;
  return toThreadHeader({
    conversationId: row.id,
    rentalId: row.rentalId,
    rentalStatus: row.rental.status,
    isReadonly: row.isReadonly,
    viewerRole,
    peer,
    listing: {
      id: row.rental.listing.id,
      slug: row.rental.listing.slug,
      title: row.rental.listing.title,
      coverImageUrl: row.rental.listing.images[0]?.url ?? null,
    },
    startDate: row.rental.startDate,
    endDate: row.rental.endDate,
  });
}

export async function listMessagesPage(params: {
  conversationId: string;
  userId: string;
  cursor?: string | null;
  take?: number;
  /** Set true only after membership was already verified in this request. */
  skipAccessCheck?: boolean;
}): Promise<ChatMessagesPage | null> {
  if (!params.skipAccessCheck) {
    const membership = await prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        OR: [{ buyerId: params.userId }, { sellerId: params.userId }],
      },
      select: { id: true },
    });
    if (!membership) return null;
  }

  const take = params.take ?? CHAT_MESSAGES_PAGE_SIZE;
  const cursorDate = params.cursor ? new Date(params.cursor) : null;

  const rows = await prisma.message.findMany({
    where: {
      conversationId: params.conversationId,
      hides: { none: { userId: params.userId } },
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    include: messageInclude,
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const chronological = [...page].reverse();

  return {
    messages: chronological.map((row) => toChatMessageView(row, params.userId)),
    nextCursor: hasMore ? page[page.length - 1]!.createdAt.toISOString() : null,
  };
}
