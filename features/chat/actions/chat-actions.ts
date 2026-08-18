"use server";

import type { MessageAttachmentKind } from "@prisma/client";
import { after } from "next/server";

import {
  getConversationThreadHeader,
  listConversationsForUser,
  listMessagesPage,
} from "@/features/chat/queries/conversations";
import {
  CHAT_DELETE_FOR_EVERYONE_MS,
  deleteForEveryoneSchema,
  hideMessageSchema,
  listMessagesSchema,
  markMessagesDeliveredSchema,
  markMessagesReadSchema,
  sendTextMessageSchema,
} from "@/features/chat/schemas/chat";
import {
  chatReadonlyError,
  toChatActionError,
} from "@/features/chat/services/chat-errors";
import {
  scheduleChatDeleteBroadcast,
  scheduleChatMessageBroadcast,
} from "@/features/chat/services/chat-realtime-server";
import { uploadChatAttachment } from "@/features/chat/services/chat-storage";
import {
  previewFromMessage,
  toChatMessageView,
} from "@/features/chat/services/mappers";
import type {
  ChatActionResult,
  ChatConversationListItem,
  ChatMessagesPage,
  ChatMessageView,
  ChatThreadHeader,
} from "@/features/chat/types/chat";
import {
  notifyParamsToDeliveryEvent,
  scheduleChannelDelivery,
} from "@/features/notifications/services/dispatch";
import { buildInAppNotificationData } from "@/features/rentals/services/notifications";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

async function assertParticipant(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      isReadonly: true,
      rentalId: true,
      rental: {
        select: {
          listingId: true,
          listing: { select: { title: true } },
        },
      },
    },
  });
  if (!conversation) {
    throw new AppError("Conversation not found.", {
      code: "NOT_FOUND",
      status: 404,
    });
  }
  return conversation;
}

function scheduleChatMessageNotification(params: {
  peerId: string;
  senderDisplayName: string;
  messageBody: string;
  attachmentKind: MessageAttachmentKind | null;
  attachmentName: string | null;
  rentalId: string;
  listingId: string;
  listingTitle: string;
  conversationId: string;
  messageId: string;
}) {
  after(async () => {
    try {
      await prisma.notification.create({
        data: buildInAppNotificationData({
          userId: params.peerId,
          type: "NEW_MESSAGE",
          title: "New message",
          body: `${params.senderDisplayName}: ${previewFromMessage({
            body: params.messageBody,
            attachmentKind: params.attachmentKind,
            attachmentName: params.attachmentName,
          })}`,
          rentalId: params.rentalId,
          listingId: params.listingId,
          payload: {
            conversationId: params.conversationId,
            messageId: params.messageId,
            listingTitle: params.listingTitle,
          },
        }),
      });

      scheduleChannelDelivery([
        notifyParamsToDeliveryEvent({
          userId: params.peerId,
          type: "NEW_MESSAGE",
          title: "New message",
          body: `${params.senderDisplayName}: ${previewFromMessage({
            body: params.messageBody,
            attachmentKind: params.attachmentKind,
            attachmentName: params.attachmentName,
          })}`,
          rentalId: params.rentalId,
          listingId: params.listingId,
          payload: { conversationId: params.conversationId },
          dedupeSeed: params.messageId,
        }),
      ]);
    } catch (error) {
      logger.error("scheduleChatMessageNotification failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  });
}

export async function getChatInboxAction(): Promise<
  ChatActionResult<ChatConversationListItem[]>
> {
  try {
    const { profile } = await requireUser();
    const data = await listConversationsForUser(profile.id);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toChatActionError(error) };
  }
}

export async function getChatUnreadTotalAction(): Promise<
  ChatActionResult<number>
> {
  try {
    const { profile } = await requireUser();
    const total = await prisma.message.count({
      where: {
        senderId: { not: profile.id },
        readAt: null,
        hides: { none: { userId: profile.id } },
        conversation: {
          OR: [{ buyerId: profile.id }, { sellerId: profile.id }],
        },
      },
    });
    return { ok: true, data: total };
  } catch (error) {
    return { ok: false, error: toChatActionError(error) };
  }
}

export async function getChatThreadAction(conversationId: string): Promise<
  ChatActionResult<{
    header: ChatThreadHeader;
    page: ChatMessagesPage;
  }>
> {
  try {
    const { profile } = await requireUser();
    const header = await getConversationThreadHeader(
      conversationId,
      profile.id,
    );
    if (!header) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Conversation not found." },
      };
    }
    const page = await listMessagesPage({
      conversationId,
      userId: profile.id,
      skipAccessCheck: true,
    });
    if (!page) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Conversation not found." },
      };
    }
    return { ok: true, data: { header, page } };
  } catch (error) {
    return { ok: false, error: toChatActionError(error) };
  }
}

export async function listChatMessagesAction(
  input: unknown,
): Promise<ChatActionResult<ChatMessagesPage>> {
  try {
    const { profile } = await requireUser();
    const parsed = listMessagesSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid request.",
        },
      };
    }
    const page = await listMessagesPage({
      conversationId: parsed.data.conversationId,
      userId: profile.id,
      cursor: parsed.data.cursor,
      take: parsed.data.take,
    });
    if (!page) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Conversation not found." },
      };
    }
    return { ok: true, data: page };
  } catch (error) {
    return { ok: false, error: toChatActionError(error) };
  }
}

export async function sendChatTextMessageAction(
  input: unknown,
): Promise<ChatActionResult<ChatMessageView>> {
  try {
    const { profile } = await requireUser();
    const parsed = sendTextMessageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid message.",
        },
      };
    }

    const conversation = await assertParticipant(
      parsed.data.conversationId,
      profile.id,
    );
    if (conversation.isReadonly) throw chatReadonlyError();

    if (parsed.data.replyToId) {
      const reply = await prisma.message.findFirst({
        where: {
          id: parsed.data.replyToId,
          conversationId: conversation.id,
        },
        select: { id: true },
      });
      if (!reply) {
        return {
          ok: false,
          error: { code: "VALIDATION", message: "Reply target not found." },
        };
      }
    }

    const actionStarted = Date.now();

    const created = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: profile.id,
          body: parsed.data.body,
          replyToId: parsed.data.replyToId ?? null,
        },
        include: {
          sender: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
          replyTo: {
            select: {
              id: true,
              body: true,
              attachmentKind: true,
              attachmentName: true,
              sender: { select: { displayName: true } },
            },
          },
        },
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: message.createdAt },
      });

      const peerId =
        conversation.buyerId === profile.id
          ? conversation.sellerId
          : conversation.buyerId;

      return { message, peerId };
    });

    const dbCommitMs = Date.now() - actionStarted;

    scheduleChatMessageNotification({
      peerId: created.peerId,
      senderDisplayName: profile.displayName,
      messageBody: created.message.body,
      attachmentKind: null,
      attachmentName: null,
      rentalId: conversation.rentalId,
      listingId: conversation.rental.listingId,
      listingTitle: conversation.rental.listing.title,
      conversationId: conversation.id,
      messageId: created.message.id,
    });

    const view = toChatMessageView(created.message, profile.id);

    scheduleChatMessageBroadcast({
      peerId: created.peerId,
      conversationId: conversation.id,
      message: view,
      senderName: profile.displayName,
    });

    if (process.env.PERF_CHAT === "1") {
      logger.info("chat.send.timing", {
        conversationId: conversation.id,
        messageId: created.message.id,
        dbCommitMs,
        totalMs: Date.now() - actionStarted,
      });
    }

    return {
      ok: true,
      data: view,
    };
  } catch (error) {
    logger.error("sendChatTextMessageAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: toChatActionError(error) };
  }
}

export async function sendChatAttachmentAction(
  formData: FormData,
): Promise<ChatActionResult<ChatMessageView>> {
  try {
    const { profile } = await requireUser();
    const conversationId = String(formData.get("conversationId") ?? "");
    const body = String(formData.get("body") ?? "").trim();
    const replyToIdRaw = formData.get("replyToId");
    const replyToId =
      typeof replyToIdRaw === "string" && replyToIdRaw.length > 0
        ? replyToIdRaw
        : null;
    const file = formData.get("file");

    if (!conversationId || !(file instanceof File)) {
      return {
        ok: false,
        error: { code: "VALIDATION", message: "Missing attachment." },
      };
    }

    const conversation = await assertParticipant(conversationId, profile.id);
    if (conversation.isReadonly) throw chatReadonlyError();

    const uploaded = await uploadChatAttachment({
      userId: profile.id,
      conversationId,
      file,
    });

    const actionStarted = Date.now();

    const created = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId: profile.id,
          body,
          replyToId,
          attachmentKind: uploaded.kind,
          attachmentPath: uploaded.path,
          attachmentUrl: uploaded.url,
          attachmentName: uploaded.name,
          attachmentMime: uploaded.mime,
          attachmentSize: uploaded.size,
        },
        include: {
          sender: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
          replyTo: {
            select: {
              id: true,
              body: true,
              attachmentKind: true,
              attachmentName: true,
              sender: { select: { displayName: true } },
            },
          },
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });

      const peerId =
        conversation.buyerId === profile.id
          ? conversation.sellerId
          : conversation.buyerId;

      return { message, peerId };
    });

    scheduleChatMessageNotification({
      peerId: created.peerId,
      senderDisplayName: profile.displayName,
      messageBody: created.message.body,
      attachmentKind: created.message.attachmentKind,
      attachmentName: created.message.attachmentName,
      rentalId: conversation.rentalId,
      listingId: conversation.rental.listingId,
      listingTitle: conversation.rental.listing.title,
      conversationId,
      messageId: created.message.id,
    });

    const view = toChatMessageView(created.message, profile.id);

    scheduleChatMessageBroadcast({
      peerId: created.peerId,
      conversationId,
      message: view,
      senderName: profile.displayName,
    });

    if (process.env.PERF_CHAT === "1") {
      logger.info("chat.sendAttachment.timing", {
        conversationId,
        messageId: created.message.id,
        dbCommitMs: Date.now() - actionStarted,
        totalMs: Date.now() - actionStarted,
      });
    }

    return {
      ok: true,
      data: view,
    };
  } catch (error) {
    logger.error("sendChatAttachmentAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: toChatActionError(error) };
  }
}

export async function hideChatMessageAction(
  input: unknown,
): Promise<ChatActionResult<{ messageId: string }>> {
  try {
    const { profile } = await requireUser();
    const parsed = hideMessageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: "VALIDATION", message: "Invalid message." },
      };
    }

    const message = await prisma.message.findFirst({
      where: { id: parsed.data.messageId },
      select: {
        id: true,
        conversationId: true,
        conversation: { select: { buyerId: true, sellerId: true } },
      },
    });
    if (!message) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Message not found." },
      };
    }
    await assertParticipant(message.conversationId, profile.id);

    await prisma.messageHide.upsert({
      where: {
        messageId_userId: {
          messageId: message.id,
          userId: profile.id,
        },
      },
      create: { messageId: message.id, userId: profile.id },
      update: {},
    });

    scheduleChatDeleteBroadcast({
      conversationId: message.conversationId,
      messageId: message.id,
      scope: "me",
      byUserId: profile.id,
    });

    return { ok: true, data: { messageId: message.id } };
  } catch (error) {
    return { ok: false, error: toChatActionError(error) };
  }
}

export async function deleteChatMessageForEveryoneAction(
  input: unknown,
): Promise<ChatActionResult<{ messageId: string }>> {
  try {
    const { profile } = await requireUser();
    const parsed = deleteForEveryoneSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: "VALIDATION", message: "Invalid message." },
      };
    }

    const message = await prisma.message.findFirst({
      where: { id: parsed.data.messageId },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        createdAt: true,
        deletedForEveryoneAt: true,
        conversation: { select: { buyerId: true, sellerId: true } },
      },
    });
    if (!message) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Message not found." },
      };
    }
    if (message.senderId !== profile.id) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Only the sender can delete for everyone.",
        },
      };
    }
    if (message.deletedForEveryoneAt) {
      return { ok: true, data: { messageId: message.id } };
    }

    const ageMs = Date.now() - message.createdAt.getTime();
    if (ageMs > CHAT_DELETE_FOR_EVERYONE_MS) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Delete window has expired.",
        },
      };
    }

    await assertParticipant(message.conversationId, profile.id);

    const now = new Date();
    await prisma.message.update({
      where: { id: message.id },
      data: {
        deletedForEveryoneAt: now,
        deletedById: profile.id,
      },
    });

    const peerId =
      message.conversation.buyerId === profile.id
        ? message.conversation.sellerId
        : message.conversation.buyerId;

    scheduleChatDeleteBroadcast({
      peerId,
      conversationId: message.conversationId,
      messageId: message.id,
      scope: "everyone",
      byUserId: profile.id,
    });

    return { ok: true, data: { messageId: message.id } };
  } catch (error) {
    return { ok: false, error: toChatActionError(error) };
  }
}

export async function markChatMessagesReadAction(
  input: unknown,
): Promise<ChatActionResult<{ updated: number; messageIds: string[] }>> {
  try {
    const { profile } = await requireUser();
    const parsed = markMessagesReadSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: "VALIDATION", message: "Invalid request." },
      };
    }
    await assertParticipant(parsed.data.conversationId, profile.id);

    const updated = await prisma.message.findMany({
      where: {
        conversationId: parsed.data.conversationId,
        senderId: { not: profile.id },
        readAt: null,
      },
      select: { id: true },
    });

    if (updated.length === 0) {
      return { ok: true, data: { updated: 0, messageIds: [] as string[] } };
    }

    const ids = updated.map((m) => m.id);
    const now = new Date();
    await prisma.message.updateMany({
      where: { id: { in: ids } },
      data: {
        readAt: now,
        deliveredAt: now,
      },
    });

    return {
      ok: true,
      data: { updated: ids.length, messageIds: ids },
    };
  } catch (error) {
    return { ok: false, error: toChatActionError(error) };
  }
}

export async function markChatMessagesDeliveredAction(
  input: unknown,
): Promise<ChatActionResult<{ updated: number; messageIds: string[] }>> {
  try {
    const { profile } = await requireUser();
    const parsed = markMessagesDeliveredSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: "VALIDATION", message: "Invalid request." },
      };
    }
    await assertParticipant(parsed.data.conversationId, profile.id);

    const eligible = await prisma.message.findMany({
      where: {
        id: { in: parsed.data.messageIds },
        conversationId: parsed.data.conversationId,
        senderId: { not: profile.id },
        deliveredAt: null,
      },
      select: { id: true },
    });
    const ids = eligible.map((m) => m.id);
    if (ids.length === 0) {
      return { ok: true, data: { updated: 0, messageIds: [] } };
    }

    await prisma.message.updateMany({
      where: { id: { in: ids } },
      data: { deliveredAt: new Date() },
    });

    return { ok: true, data: { updated: ids.length, messageIds: ids } };
  } catch (error) {
    return { ok: false, error: toChatActionError(error) };
  }
}

export async function touchLastSeenAction(): Promise<{ ok: boolean }> {
  try {
    const { profile } = await requireUser();
    await prisma.profile.update({
      where: { id: profile.id },
      data: { lastSeenAt: new Date() },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
