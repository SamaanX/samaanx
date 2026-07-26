import type { Notification, NotificationType } from "@prisma/client";

export type NotificationView = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  rentalId: string | null;
  listingId: string | null;
  payload: unknown;
  readAt: string | null;
  createdAt: string;
  href: string;
  ctaLabel: string;
};

function payloadStage(payload: unknown): "HANDOVER" | "RETURN" | null {
  if (!payload || typeof payload !== "object") return null;
  const stage = (payload as { stage?: unknown }).stage;
  if (stage === "HANDOVER" || stage === "RETURN") return stage;
  return null;
}

export function resolveNotificationCta(
  type: NotificationType,
  title: string,
  options?: { payload?: unknown },
): string {
  const stage = payloadStage(options?.payload);
  const lower = title.toLowerCase();

  switch (type) {
    case "RENTAL_REQUESTED":
      return lower.includes("new rental") ? "Review Request" : "Open Rental";
    case "RENTAL_APPROVED":
      return "Continue Rental";
    case "RENTAL_REJECTED":
      return "View Details";
    case "RENTAL_CANCELLED":
      return "View Rental";
    case "VERIFICATION_READY":
      if (stage === "RETURN" || lower.includes("return")) {
        return lower.includes("waiting") ? "Complete Return" : "Review Return";
      }
      return "Continue Verification";
    case "HANDOVER_COMPLETED":
      return "Open Rental";
    case "RETURN_COMPLETED":
      return "Open Rental";
    case "REVIEW_REMINDER":
      return "Leave Review";
    case "NEW_MESSAGE":
      return "Go to Chat";
    case "SECURITY_ALERT":
      return "Review security";
    case "ACCOUNT_CHANGE":
      return "View profile";
    default:
      return "View";
  }
}

export function resolveNotificationHref(
  type: NotificationType,
  title: string,
  options?: {
    rentalId?: string | null;
    payload?: unknown;
  },
): string {
  const rentalId = options?.rentalId ?? null;
  const stage = payloadStage(options?.payload);
  const lowerTitle = title.toLowerCase();

  switch (type) {
    case "RENTAL_REQUESTED":
      return lowerTitle.includes("new rental") ? "/seller/rentals" : "/rentals";
    case "RENTAL_APPROVED":
      return rentalId ? `/rentals/${rentalId}/handover` : "/rentals";
    case "RENTAL_REJECTED":
    case "RENTAL_CANCELLED":
      return "/rentals";
    case "VERIFICATION_READY": {
      if (rentalId && (stage === "RETURN" || lowerTitle.includes("return"))) {
        return `/rentals/${rentalId}/return`;
      }
      if (rentalId) {
        return `/rentals/${rentalId}/handover`;
      }
      return "/rentals";
    }
    case "HANDOVER_COMPLETED":
      return "/rentals";
    case "RETURN_COMPLETED":
      return "/rentals";
    case "REVIEW_REMINDER":
      return rentalId ? `/rentals/${rentalId}/review` : "/rentals";
    case "NEW_MESSAGE": {
      const conversationId =
        options?.payload &&
        typeof options.payload === "object" &&
        typeof (options.payload as { conversationId?: unknown })
          .conversationId === "string"
          ? (options.payload as { conversationId: string }).conversationId
          : null;
      return conversationId ? `/chat/${conversationId}` : "/chat";
    }
    case "SECURITY_ALERT":
    case "ACCOUNT_CHANGE":
      return "/profile#notifications";
    case "SYSTEM":
    default:
      return "/notifications";
  }
}

export function toNotificationView(row: Notification): NotificationView {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    rentalId: row.rentalId,
    listingId: row.listingId,
    payload: row.payload,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    href: resolveNotificationHref(row.type, row.title, {
      rentalId: row.rentalId,
      payload: row.payload,
    }),
    ctaLabel: resolveNotificationCta(row.type, row.title, {
      payload: row.payload,
    }),
  };
}
