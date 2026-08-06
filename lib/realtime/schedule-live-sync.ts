import { after } from "next/server";

import { wakeUsersLiveSync } from "@/features/realtime/server-live-sync";

/**
 * Wake peer browsers after the Server Action response is sent.
 * Realtime broadcast must not block rental / verification mutations.
 */
export function scheduleLiveSyncAfterResponse(
  userIds: Array<string | null | undefined>,
  options?: { rentalId?: string | null },
): void {
  after(() => {
    void wakeUsersLiveSync(userIds, options);
  });
}
