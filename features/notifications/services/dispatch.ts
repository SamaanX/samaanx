import type { NotificationType } from "@prisma/client";

import {
  getNotificationPreferences,
  shouldSendChatEmail,
  shouldSendEmailForType,
  shouldSendPushForType,
  shouldSendRentalEmail,
} from "@/features/notifications/services/preferences";
import {
  resolveNotificationCta,
  resolveNotificationHref,
} from "@/features/notifications/types/notification";
import { sendBrandedEmail } from "@/lib/email/send";
import { buildEmailFromNotification } from "@/lib/email/types";
import { logger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push/send";

export type ChannelDeliveryEvent = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  rentalId?: string | null;
  listingId?: string | null;
  payload?: unknown;
  notificationId?: string;
  /** Stable key fragment — combined with userId+type for dedupe. */
  dedupeSeed?: string;
};

function buildDedupeKey(event: ChannelDeliveryEvent): string {
  const seed =
    event.dedupeSeed ??
    [event.rentalId, event.listingId, event.title].filter(Boolean).join(":");
  const day = new Date().toISOString().slice(0, 10);
  return `${event.userId}:${event.type}:${seed}:${day}`;
}

/**
 * Async side effects after in-app notification is persisted.
 * Never throws — email/push must not block user flows.
 */
export async function deliverNotificationChannels(
  event: ChannelDeliveryEvent,
): Promise<void> {
  try {
    const prefs = await getNotificationPreferences(event.userId);
    if (!prefs) return;

    const href = resolveNotificationHref(event.type, event.title, {
      rentalId: event.rentalId,
      payload: event.payload,
    });
    const ctaLabel = resolveNotificationCta(event.type, event.title, {
      payload: event.payload,
    });

    const dedupeKey = buildDedupeKey(event);

    const emailAllowed =
      prefs.notifyEmailEnabled &&
      shouldSendEmailForType(event.type) &&
      (event.type === "NEW_MESSAGE"
        ? shouldSendChatEmail(prefs)
        : event.type.startsWith("RENTAL_") ||
            event.type === "VERIFICATION_READY" ||
            event.type === "HANDOVER_COMPLETED" ||
            event.type === "RETURN_COMPLETED" ||
            event.type === "REVIEW_REMINDER"
          ? shouldSendRentalEmail(prefs)
          : true);

    if (emailAllowed) {
      const content = buildEmailFromNotification({
        type: event.type,
        title: event.title,
        body: event.body,
        href,
        ctaLabel,
        displayName: prefs.displayName,
      });
      if (content) {
        void sendBrandedEmail({
          userId: event.userId,
          to: prefs.email,
          displayName: prefs.displayName,
          dedupeKey: `email:${dedupeKey}`,
          ...content,
        });
      }
    }

    if (
      prefs.notifyPushEnabled &&
      shouldSendPushForType(event.type, prefs, event.payload)
    ) {
      void sendPushToUser(event.userId, {
        title: event.title,
        body: event.body,
        url: href,
        tag: dedupeKey,
        dedupeKey: `push:${dedupeKey}`,
        notificationId: event.notificationId,
        type: event.type,
      });
    }
  } catch (error) {
    logger.error("deliverNotificationChannels failed", {
      message: error instanceof Error ? error.message : "unknown_error",
      userId: event.userId,
      type: event.type,
    });
  }
}

/** Fire-and-forget multi-recipient delivery (after transaction commit). */
export function scheduleChannelDelivery(events: ChannelDeliveryEvent[]): void {
  for (const event of events) {
    void deliverNotificationChannels(event);
  }
}

export function notifyParamsToDeliveryEvent(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  rentalId: string;
  listingId: string;
  payload?: unknown;
  dedupeSeed?: string;
  notificationId?: string;
}): ChannelDeliveryEvent {
  return {
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    rentalId: params.rentalId,
    listingId: params.listingId,
    payload: params.payload,
    dedupeSeed: params.dedupeSeed ?? params.rentalId,
    notificationId: params.notificationId,
  };
}

/** Email/push for handover & return verification codes. */
export function scheduleVerificationReadyDelivery(params: {
  buyerId: string;
  sellerId: string;
  rentalId: string;
  listingId: string;
  listingTitle: string;
  stage: "HANDOVER" | "RETURN";
}): void {
  const stageLabel = params.stage === "HANDOVER" ? "handover" : "return";
  const title = `${params.stage === "HANDOVER" ? "Handover" : "Return"} codes ready`;
  const body = `Verification codes for “${params.listingTitle}” ${stageLabel} are ready.`;
  const payload = { rentalId: params.rentalId, stage: params.stage };
  scheduleChannelDelivery([
    notifyParamsToDeliveryEvent({
      userId: params.buyerId,
      type: "VERIFICATION_READY",
      title,
      body,
      rentalId: params.rentalId,
      listingId: params.listingId,
      payload,
    }),
    notifyParamsToDeliveryEvent({
      userId: params.sellerId,
      type: "VERIFICATION_READY",
      title,
      body,
      rentalId: params.rentalId,
      listingId: params.listingId,
      payload,
    }),
  ]);
}
