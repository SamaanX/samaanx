"use server";

import {
  getNotificationsForUser,
  getUnreadNotificationCount,
} from "@/features/notifications/queries/notifications";
import type { NotificationView } from "@/features/notifications/types/notification";
import { getCurrentProfile } from "@/lib/auth/guards";
import { withPerf } from "@/lib/perf";

export type NotificationsSnapshot = {
  unreadCount: number;
  recent: NotificationView[];
};

export async function getNotificationsSnapshotAction(): Promise<NotificationsSnapshot> {
  return withPerf("notifications.snapshot", async () => {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { unreadCount: 0, recent: [] };
    }

    const [unreadCount, recent] = await Promise.all([
      getUnreadNotificationCount(profile.id),
      getNotificationsForUser(profile.id, 8),
    ]);

    return { unreadCount, recent };
  });
}
