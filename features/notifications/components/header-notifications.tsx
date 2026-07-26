import { Suspense } from "react";

import { HeaderNotificationsClient } from "@/features/notifications/components/header-notifications-client";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
} from "@/features/notifications/queries/notifications";
import { withPerf } from "@/lib/perf";

function NotificationBellFallback() {
  return (
    <div
      className="inline-flex size-10 items-center justify-center rounded-xl"
      aria-hidden
    >
      <span className="bg-muted/80 size-5 rounded-md" />
    </div>
  );
}

async function HeaderNotificationsInner({ userId }: { userId: string }) {
  const [unreadCount, recent] = await withPerf(
    "layout.headerNotifications",
    () =>
      Promise.all([
        getUnreadNotificationCount(userId),
        getNotificationsForUser(userId, 8),
      ]),
  );

  return (
    <HeaderNotificationsClient
      userId={userId}
      unreadCount={unreadCount}
      recent={recent}
    />
  );
}

/** Streams notification bell so marketplace layout is not blocked on Prisma. */
export function HeaderNotifications({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<NotificationBellFallback />}>
      <HeaderNotificationsInner userId={userId} />
    </Suspense>
  );
}
