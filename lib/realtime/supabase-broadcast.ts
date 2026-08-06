import { getServerEnv } from "@/config/env";
import { logger } from "@/lib/logger";
import { getSupabaseServiceRoleKey } from "@/lib/realtime/service-role-key";

export type BroadcastMessage = {
  topic: string;
  event: string;
  payload: unknown;
};

/**
 * Push events to Supabase Realtime via HTTP broadcast API.
 */
export async function postSupabaseBroadcast(
  messages: BroadcastMessage[],
): Promise<void> {
  if (messages.length === 0) return;

  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) return;

  const env = getServerEnv();

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
        signal: AbortSignal.timeout(2500),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error("postSupabaseBroadcast failed", {
        status: response.status,
        body: body.slice(0, 200),
      });
    }
  } catch (error) {
    logger.error("postSupabaseBroadcast error", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
