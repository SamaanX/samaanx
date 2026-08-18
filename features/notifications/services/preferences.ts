import type { NotificationType, Profile } from "@prisma/client";

import {
  filterNotificationTypes,
  type NotificationFilter,
  notificationMatchesFilter,
} from "@/features/notifications/services/notification-filter";
import { prisma } from "@/lib/db/prisma";

export type { NotificationFilter };
export { filterNotificationTypes, notificationMatchesFilter };
export type NotificationPreferencesView = {
  notifyEmailEnabled: boolean;
  notifyPushEnabled: boolean;
  notifyChatEnabled: boolean;
  notifyRentalEnabled: boolean;
  notifyMarketingEnabled: boolean;
  notifyWeeklyDigestEnabled: boolean;
  pushPromptDismissedAt: string | null;
};

export type NotificationPreferencesProfile = NotificationPreferencesView & {
  email: string;
  displayName: string;
};

const PREFERENCE_SELECT = {
  email: true,
  displayName: true,
  notifyEmailEnabled: true,
  notifyPushEnabled: true,
  notifyChatEnabled: true,
  notifyRentalEnabled: true,
  notifyMarketingEnabled: true,
  notifyWeeklyDigestEnabled: true,
  pushPromptDismissedAt: true,
} as const;

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferencesProfile | null> {
  const row = await prisma.profile.findUnique({
    where: { id: userId },
    select: PREFERENCE_SELECT,
  });
  if (!row) return null;
  return {
    ...toPreferencesView(row),
    email: row.email,
    displayName: row.displayName,
  };
}

export function toPreferencesView(
  profile: Pick<
    Profile,
    | "notifyEmailEnabled"
    | "notifyPushEnabled"
    | "notifyChatEnabled"
    | "notifyRentalEnabled"
    | "notifyMarketingEnabled"
    | "notifyWeeklyDigestEnabled"
    | "pushPromptDismissedAt"
  >,
): NotificationPreferencesView {
  return {
    notifyEmailEnabled: profile.notifyEmailEnabled,
    notifyPushEnabled: profile.notifyPushEnabled,
    notifyChatEnabled: profile.notifyChatEnabled,
    notifyRentalEnabled: profile.notifyRentalEnabled,
    notifyMarketingEnabled: profile.notifyMarketingEnabled,
    notifyWeeklyDigestEnabled: profile.notifyWeeklyDigestEnabled,
    pushPromptDismissedAt: profile.pushPromptDismissedAt?.toISOString() ?? null,
  };
}

const RENTAL_TYPES: NotificationType[] = [
  "RENTAL_REQUESTED",
  "RENTAL_APPROVED",
  "RENTAL_REJECTED",
  "RENTAL_CANCELLED",
  "VERIFICATION_READY",
  "HANDOVER_COMPLETED",
  "RETURN_COMPLETED",
  "REVIEW_REMINDER",
];

const PUSH_TYPES: NotificationType[] = [
  "RENTAL_REQUESTED",
  "RENTAL_APPROVED",
  "RENTAL_REJECTED",
  "VERIFICATION_READY",
  "NEW_MESSAGE",
  "REVIEW_REMINDER",
  "SECURITY_ALERT",
];

export function shouldSendEmailForType(type: NotificationType): boolean {
  if (type === "SECURITY_ALERT" || type === "ACCOUNT_CHANGE") return true;
  if (type === "SYSTEM") return false;
  return true;
}

export function shouldSendRentalEmail(
  prefs: NotificationPreferencesView,
): boolean {
  return prefs.notifyRentalEnabled;
}

export function shouldSendChatEmail(
  prefs: NotificationPreferencesView,
): boolean {
  return prefs.notifyChatEnabled;
}

export function shouldSendPushForType(
  type: NotificationType,
  prefs: NotificationPreferencesView,
  payload?: unknown,
): boolean {
  if (type === "SECURITY_ALERT") return true;
  if (type === "NEW_MESSAGE") return prefs.notifyChatEnabled;
  if (RENTAL_TYPES.includes(type)) return prefs.notifyRentalEnabled;
  if (type === "SYSTEM" && isReviewReceivedPayload(payload)) {
    return prefs.notifyRentalEnabled;
  }
  if (type === "SYSTEM" && isAnnouncementPayload(payload)) {
    return prefs.notifyPushEnabled;
  }
  return PUSH_TYPES.includes(type);
}

function isAnnouncementPayload(payload: unknown): boolean {
  return (
    Boolean(payload) &&
    typeof payload === "object" &&
    (payload as { kind?: unknown }).kind === "announcement"
  );
}

function isReviewReceivedPayload(payload: unknown): boolean {
  return (
    Boolean(payload) &&
    typeof payload === "object" &&
    (payload as { kind?: unknown }).kind === "review_received"
  );
}
