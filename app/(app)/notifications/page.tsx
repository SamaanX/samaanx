import { SamaanXLogo } from "@/components/brand/samaanx-logo";
import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { NotificationsPageClient } from "@/features/notifications/components/notifications-page-client";
import { getNotificationsForUser } from "@/features/notifications/queries/notifications";
import { requireUser } from "@/lib/auth/guards";
import { withPerf } from "@/lib/perf";

export const metadata = {
  title: "Notifications",
  description: "Your SamaanX in-app notifications.",
};

export default async function NotificationsPage() {
  const { profile } = await requireUser();
  const items = await withPerf("route.notifications", () =>
    getNotificationsForUser(profile.id),
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <header className="border-border/60 bg-background/85 sticky top-0 z-20 -mx-4 mb-6 flex items-center justify-between gap-3 border-b px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <BackButton fallbackHref={BACK_FALLBACKS.notifications} />
        <SamaanXLogo className="[&_img]:h-7" />
      </header>

      <NotificationsPageClient initialItems={items} />
    </div>
  );
}
