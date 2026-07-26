import { getServerEnv } from "@/config/env";
import { logger } from "@/lib/logger";

type LiveSyncPayload = {
  at: string;
  rentalId?: string | null;
};

/**
 * Wake peer browsers via Supabase Realtime Broadcast (HTTP, no WebSocket).
 * Complements client `notifyUsersLiveSync` so sync does not depend on the
 * mutator's tab staying open. Peers subscribe on `live-sync:{userId}`.
 */
export async function wakeUsersLiveSync(
  userIds: Array<string | null | undefined>,
  options?: { rentalId?: string | null },
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean) as string[])];
  if (unique.length === 0) return;

  const env = getServerEnv();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    logger.warn("wakeUsersLiveSync skipped: SUPABASE_SERVICE_ROLE_KEY missing");
    return;
  }

  const payload: LiveSyncPayload = {
    at: new Date().toISOString(),
    rentalId: options?.rentalId ?? null,
  };

  const messages = unique.map((userId) => ({
    topic: `live-sync:${userId}`,
    event: "sync",
    payload,
  }));

  try {
    const response = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
        // Server Actions should not hang if Realtime is slow.
        signal: AbortSignal.timeout(2500),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.warn("wakeUsersLiveSync broadcast failed", {
        status: response.status,
        body: body.slice(0, 200),
      });
    }
  } catch (error) {
    logger.warn("wakeUsersLiveSync error", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
