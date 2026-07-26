"use server";

import { getNotificationsForUser } from "@/features/notifications/queries/notifications";
import type { NotificationView } from "@/features/notifications/types/notification";
import { getCurrentProfile } from "@/lib/auth/guards";
import { withPerf } from "@/lib/perf";

export async function getNotificationsInboxAction(): Promise<
  NotificationView[]
> {
  return withPerf("notifications.inbox", async () => {
    const profile = await getCurrentProfile();
    if (!profile) return [];
    return getNotificationsForUser(profile.id);
  });
}
