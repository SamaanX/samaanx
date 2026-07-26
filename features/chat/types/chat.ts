import type { MessageAttachmentKind, RentalStatus } from "@prisma/client";

export type ChatActionError = {
  message: string;
  code:
    | "VALIDATION"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "READONLY"
    | "CONFLICT"
    | "INTERNAL";
};

export type ChatActionResult<T> =
  { ok: true; data: T } | { ok: false; error: ChatActionError };

export type ChatPeerView = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  lastSeenAt: string | null;
};

export type ChatListingThumb = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
};

export type ChatAttachmentView = {
  kind: MessageAttachmentKind;
  path: string;
  url: string;
  name: string;
  mime: string;
  size: number;
};

export type ChatReplyPreview = {
  id: string;
  body: string;
  senderName: string;
  hasAttachment: boolean;
};

export type ChatMessageStatus = "sending" | "sent" | "delivered" | "seen";

export type ChatMessageView = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  status: ChatMessageStatus;
  isMine: boolean;
  attachment: ChatAttachmentView | null;
  replyTo: ChatReplyPreview | null;
  /** Client-only optimistic flag */
  optimistic?: boolean;
};

export type ChatConversationListItem = {
  id: string;
  rentalId: string;
  rentalStatus: RentalStatus;
  isReadonly: boolean;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  peer: ChatPeerView;
  listing: ChatListingThumb;
};

export type ChatThreadHeader = {
  conversationId: string;
  rentalId: string;
  rentalStatus: RentalStatus;
  isReadonly: boolean;
  viewerRole: "buyer" | "seller";
  peer: ChatPeerView;
  listing: ChatListingThumb;
  startDate: string;
  endDate: string;
};

export type ChatMessagesPage = {
  messages: ChatMessageView[];
  nextCursor: string | null;
};

export type ChatRentalBanner = {
  id: string;
  tone: "blue" | "green" | "yellow" | "orange" | "purple" | "red" | "muted";
  title: string;
  description?: string;
  ctaLabel?: string;
  href?: string;
};
