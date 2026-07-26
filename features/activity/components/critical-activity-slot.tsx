import { Suspense } from "react";

import { ActivityBanner } from "@/features/activity/components/activity-banner";
import { getCriticalActivitySnapshot } from "@/features/activity/queries/critical-activity";
import type { AppUiMode } from "@/lib/ui/app-mode";

async function ActivityBannerLoader({
  userId,
  preferredMode,
}: {
  userId: string;
  preferredMode: AppUiMode;
}) {
  const initial = await getCriticalActivitySnapshot(userId, preferredMode);
  return (
    <ActivityBanner
      userId={userId}
      preferredMode={preferredMode}
      initial={initial}
    />
  );
}

export function CriticalActivitySlot({
  userId,
  preferredMode,
}: {
  userId: string;
  preferredMode: AppUiMode;
}) {
  return (
    <Suspense fallback={null}>
      <ActivityBannerLoader userId={userId} preferredMode={preferredMode} />
    </Suspense>
  );
}
