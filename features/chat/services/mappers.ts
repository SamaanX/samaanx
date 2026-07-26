import type {
  Message,
  MessageAttachmentKind,
  Profile,
  RentalStatus,
} from "@prisma/client";

import type {
  ChatConversationListItem,
  ChatMessageStatus,
  ChatMessageView,
  ChatRentalBanner,
  ChatReplyPreview,
  ChatThreadHeader,
} from "@/features/chat/types/chat";

type MessageRow = Message & {
  sender: Pick<Profile, "id" | "displayName" | "avatarUrl">;
  replyTo:
    | (Pick<Message, "id" | "body" | "attachmentKind" | "attachmentName"> & {
        sender: Pick<Profile, "displayName">;
      })
    | null;
};

export function messageStatus(params: {
  isMine: boolean;
  deliveredAt: Date | null;
  readAt: Date | null;
  optimistic?: boolean;
}): ChatMessageStatus {
  if (params.optimistic) return "sending";
  if (!params.isMine) return "sent";
  if (params.readAt) return "seen";
  if (params.deliveredAt) return "delivered";
  return "sent";
}

export function toChatMessageView(
  row: MessageRow,
  viewerId: string,
): ChatMessageView {
  const isMine = row.senderId === viewerId;
  const attachment =
    row.attachmentKind &&
    row.attachmentPath &&
    row.attachmentUrl &&
    row.attachmentName &&
    row.attachmentMime &&
    row.attachmentSize != null
      ? {
          kind: row.attachmentKind,
          path: row.attachmentPath,
          url: row.attachmentUrl,
          name: row.attachmentName,
          mime: row.attachmentMime,
          size: row.attachmentSize,
        }
      : null;

  let replyTo: ChatReplyPreview | null = null;
  if (row.replyTo) {
    replyTo = {
      id: row.replyTo.id,
      body: row.replyTo.body,
      senderName: row.replyTo.sender.displayName,
      hasAttachment: Boolean(row.replyTo.attachmentKind),
    };
  }

  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    status: messageStatus({
      isMine,
      deliveredAt: row.deliveredAt,
      readAt: row.readAt,
    }),
    isMine,
    attachment,
    replyTo,
  };
}

export function toConversationListItem(params: {
  id: string;
  rentalId: string;
  rentalStatus: RentalStatus;
  isReadonly: boolean;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  peer: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    lastSeenAt: Date | null;
  };
  listing: {
    id: string;
    slug: string;
    title: string;
    coverImageUrl: string | null;
  };
}): ChatConversationListItem {
  return {
    id: params.id,
    rentalId: params.rentalId,
    rentalStatus: params.rentalStatus,
    isReadonly: params.isReadonly,
    lastMessageAt: params.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: params.lastMessagePreview,
    unreadCount: params.unreadCount,
    peer: {
      id: params.peer.id,
      displayName: params.peer.displayName,
      avatarUrl: params.peer.avatarUrl,
      lastSeenAt: params.peer.lastSeenAt?.toISOString() ?? null,
    },
    listing: params.listing,
  };
}

export function toThreadHeader(params: {
  conversationId: string;
  rentalId: string;
  rentalStatus: RentalStatus;
  isReadonly: boolean;
  viewerRole: "buyer" | "seller";
  peer: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    lastSeenAt: Date | null;
  };
  listing: {
    id: string;
    slug: string;
    title: string;
    coverImageUrl: string | null;
  };
  startDate: Date;
  endDate: Date;
}): ChatThreadHeader {
  return {
    conversationId: params.conversationId,
    rentalId: params.rentalId,
    rentalStatus: params.rentalStatus,
    isReadonly: params.isReadonly,
    viewerRole: params.viewerRole,
    peer: {
      id: params.peer.id,
      displayName: params.peer.displayName,
      avatarUrl: params.peer.avatarUrl,
      lastSeenAt: params.peer.lastSeenAt?.toISOString() ?? null,
    },
    listing: params.listing,
    startDate: params.startDate.toISOString().slice(0, 10),
    endDate: params.endDate.toISOString().slice(0, 10),
  };
}

export function previewFromMessage(params: {
  body: string;
  attachmentKind: MessageAttachmentKind | null;
  attachmentName: string | null;
}): string {
  const trimmed = params.body.trim();
  if (trimmed) return trimmed.slice(0, 120);
  if (params.attachmentKind === "IMAGE") return "Photo";
  if (params.attachmentKind === "DOCUMENT") {
    return params.attachmentName
      ? `File: ${params.attachmentName}`
      : "Document";
  }
  return "Message";
}

export function rentalBannerForChat(params: {
  status: RentalStatus;
  role: "buyer" | "seller";
  rentalId: string;
  listingTitle: string;
}): ChatRentalBanner | null {
  const { status, role, rentalId, listingTitle } = params;
  const title = listingTitle;

  switch (status) {
    case "REQUESTED":
      return role === "seller"
        ? {
            id: "requested-seller",
            tone: "green",
            title: "Buyer requested this item.",
            description: "Approve or reject from rental requests.",
            ctaLabel: "Review request",
            href: "/seller/rentals",
          }
        : {
            id: "requested-buyer",
            tone: "yellow",
            title: "Waiting for seller approval.",
            description: `“${title}” is pending a response.`,
            ctaLabel: "View rentals",
            href: "/rentals",
          };
    case "APPROVED":
    case "HANDOVER_PENDING":
      return {
        id: "handover",
        tone: "blue",
        title: "Approved — proceed to handover.",
        description: "Verify QR or PIN to start the rental.",
        ctaLabel: "Open handover",
        href: `/rentals/${rentalId}/handover`,
      };
    case "ACTIVE":
      return role === "buyer"
        ? {
            id: "active-buyer",
            tone: "green",
            title: "Rental active.",
            description: "When finished, request return verification.",
            ctaLabel: "My rentals",
            href: "/rentals",
          }
        : {
            id: "active-seller",
            tone: "green",
            title: "Rental active.",
            description: "Buyer has your item until the return date.",
            ctaLabel: "Manage rentals",
            href: "/seller/rentals",
          };
    case "RETURN_PENDING":
      return {
        id: "return",
        tone: "purple",
        title: "Return requested.",
        description: "Complete return verification with the other party.",
        ctaLabel: "Open return",
        href: `/rentals/${rentalId}/return`,
      };
    case "COMPLETED":
      return {
        id: "completed",
        tone: "muted",
        title: "Rental completed.",
        description: "This conversation stays available for reference.",
      };
    case "REJECTED":
      return {
        id: "rejected",
        tone: "red",
        title: "Request rejected.",
        description: "Chat is read-only.",
      };
    case "CANCELLED":
      return {
        id: "cancelled",
        tone: "muted",
        title: "Rental cancelled.",
        description: "Chat is read-only.",
      };
    default:
      return null;
  }
}

export function formatLastSeen(iso: string | null, now = Date.now()): string {
  if (!iso) return "Offline";
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return "Offline";
  const diffSec = Math.max(0, Math.floor((now - at) / 1000));
  if (diffSec < 45) return "Online";
  if (diffSec < 180) return "Away";
  if (diffSec < 3600) {
    const mins = Math.max(1, Math.floor(diffSec / 60));
    return mins === 1
      ? "Last seen 1 minute ago"
      : `Last seen ${mins} minutes ago`;
  }
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(at));
  if (at >= dayStart.getTime()) return `Last seen today at ${time}`;
  const yStart = new Date(dayStart);
  yStart.setDate(yStart.getDate() - 1);
  if (at >= yStart.getTime()) return `Last seen yesterday at ${time}`;
  const date = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(at));
  return `Last seen ${date} at ${time}`;
}
