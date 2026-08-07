import { after } from "next/server";

import { wakeUsersLiveSync } from "@/features/realtime/server-live-sync";
import type { LiveSyncVerificationPatch } from "@/features/realtime/verification-sync";
import { logger } from "@/lib/logger";

/**
 * Wake peer browsers after the Server Action response is sent.
 * Realtime broadcast must not block rental / verification mutations.
 */
export function scheduleLiveSyncAfterResponse(
  userIds: Array<string | null | undefined>,
  options?: {
    rentalId?: string | null;
    verification?: LiveSyncVerificationPatch;
  },
): void {
  after(async () => {
    try {
      await wakeUsersLiveSync(userIds, options);
    } catch (error) {
      logger.error("scheduleLiveSyncAfterResponse failed", {
        userIds: [...new Set(userIds.filter(Boolean) as string[])],
        rentalId: options?.rentalId ?? null,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  });
}
