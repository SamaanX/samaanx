import type { MessageAttachmentKind } from "@prisma/client";

import type { ChatMessageView } from "@/features/chat/types/chat";

function iso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

/**
 * Build a ChatMessageView from a Supabase postgres_changes row (snake_case).
 * Enough for cache patch without a server refetch.
 */
export function chatMessageViewFromPostgresRow(
  row: Record<string, unknown>,
  viewerId: string,
): ChatMessageView | null {
  const id = typeof row.id === "string" ? row.id : null;
  const conversationId =
    typeof row.conversation_id === "string" ? row.conversation_id : null;
  const senderId = typeof row.sender_id === "string" ? row.sender_id : null;

  if (!id || !conversationId || !senderId) return null;

  const attachmentKind = row.attachment_kind as MessageAttachmentKind | null;
  const attachmentPath =
    typeof row.attachment_path === "string" ? row.attachment_path : null;
  const attachmentUrl =
    typeof row.attachment_url === "string" ? row.attachment_url : null;
  const attachmentName =
    typeof row.attachment_name === "string" ? row.attachment_name : null;
  const attachmentMime =
    typeof row.attachment_mime === "string" ? row.attachment_mime : null;
  const attachmentSize =
    typeof row.attachment_size === "number" ? row.attachment_size : null;

  const attachment =
    attachmentKind &&
    attachmentPath &&
    attachmentUrl &&
    attachmentName &&
    attachmentMime &&
    attachmentSize != null
      ? {
          kind: attachmentKind,
          path: attachmentPath,
          url: attachmentUrl,
          name: attachmentName,
          mime: attachmentMime,
          size: attachmentSize,
        }
      : null;

  const isMine = senderId === viewerId;
  const deliveredAt = iso(row.delivered_at);
  const readAt = iso(row.read_at);
  const createdAt = iso(row.created_at) ?? new Date().toISOString();

  return {
    id,
    conversationId,
    senderId,
    body: typeof row.body === "string" ? row.body : "",
    createdAt,
    deliveredAt,
    readAt,
    status: isMine
      ? readAt
        ? "seen"
        : deliveredAt
          ? "delivered"
          : "sent"
      : "sent",
    isMine,
    attachment,
    replyTo: null,
    optimistic: false,
  };
}
