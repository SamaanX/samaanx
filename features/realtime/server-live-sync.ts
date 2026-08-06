import { logger } from "@/lib/logger";
import { postSupabaseBroadcast } from "@/lib/realtime/supabase-broadcast";

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

  const payload: LiveSyncPayload = {
    at: new Date().toISOString(),
    rentalId: options?.rentalId ?? null,
  };

  const messages = unique.map((userId) => ({
    topic: `live-sync:${userId}`,
    event: "sync",
    payload,
  }));

  const result = await postSupabaseBroadcast(messages, {
    userIds: unique,
    rentalId: options?.rentalId ?? null,
  });

  if (!result.ok) {
    logger.error("wakeUsersLiveSync broadcast failed", {
      userIds: unique,
      rentalId: options?.rentalId ?? null,
      latencyMs: result.latencyMs,
      failures: result.failures,
    });
  }
}
