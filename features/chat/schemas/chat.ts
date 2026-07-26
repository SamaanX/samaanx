import { z } from "zod";

export const CHAT_MEDIA_BUCKET = "chat-media";
export const CHAT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const CHAT_MESSAGES_PAGE_SIZE = 40;

export const CHAT_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const CHAT_DOCUMENT_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const CHAT_ALLOWED_MIMES = [
  ...CHAT_IMAGE_MIMES,
  ...CHAT_DOCUMENT_MIMES,
] as const;

export function isChatImageMime(mime: string): boolean {
  return (CHAT_IMAGE_MIMES as readonly string[]).includes(mime);
}

export function isChatAllowedMime(mime: string): boolean {
  return (CHAT_ALLOWED_MIMES as readonly string[]).includes(mime);
}

export const sendTextMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(4000, "Message is too long."),
  replyToId: z.string().uuid().optional().nullable(),
  clientId: z.string().max(64).optional(),
});

export const hideMessageSchema = z.object({
  messageId: z.string().uuid(),
});

export const markMessagesReadSchema = z.object({
  conversationId: z.string().uuid(),
  upToMessageId: z.string().uuid().optional(),
});

export const markMessagesDeliveredSchema = z.object({
  conversationId: z.string().uuid(),
  messageIds: z.array(z.string().uuid()).min(1).max(100),
});

export const listMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  cursor: z.string().datetime().optional().nullable(),
  take: z.number().int().min(10).max(80).optional(),
});

export type SendTextMessageInput = z.infer<typeof sendTextMessageSchema>;
