import { getServerEnv } from "@/config/env";
import { logger } from "@/lib/logger";
import { getSupabaseServiceRoleKey } from "@/lib/realtime/service-role-key";

export type BroadcastMessage = {
  topic: string;
  event: string;
  payload: unknown;
};

export type BroadcastResult = {
  ok: boolean;
  latencyMs: number;
  failures: string[];
};

type BroadcastContext = {
  userIds?: string[];
  rentalId?: string | null;
};

/**
 * Push events to Supabase Realtime via HTTP per-event broadcast API.
 * Uses POST /realtime/v1/api/broadcast/{topic}/events/{event}
 */
export async function postSupabaseBroadcast(
  messages: BroadcastMessage[],
  context?: BroadcastContext,
): Promise<BroadcastResult> {
  if (messages.length === 0) {
    return { ok: true, latencyMs: 0, failures: [] };
  }

  const userIds =
    context?.userIds ??
    (messages
      .map((m) => {
        const match = /^live-sync:(.+)$/.exec(m.topic);
        return match?.[1] ?? null;
      })
      .filter(Boolean) as string[]);

  let serviceKey: string | null;
  try {
    serviceKey = getSupabaseServiceRoleKey();
  } catch (error) {
    logger.error("postSupabaseBroadcast aborted", {
      reason: "service_role_key_error",
      userIds,
      rentalId: context?.rentalId ?? null,
      topics: messages.map((m) => m.topic),
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      latencyMs: 0,
      failures: ["service_role_key_error"],
    };
  }

  if (!serviceKey) {
    logger.error("postSupabaseBroadcast skipped", {
      reason: "missing_service_role_key",
      userIds,
      rentalId: context?.rentalId ?? null,
      topics: messages.map((m) => m.topic),
    });
    return { ok: false, latencyMs: 0, failures: ["missing_service_role_key"] };
  }

  const env = getServerEnv();
  const started = Date.now();
  const failures: string[] = [];

  await Promise.all(
    messages.map(async (msg) => {
      const topic = encodeURIComponent(msg.topic);
      const event = encodeURIComponent(msg.event);
      const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast/${topic}/events/${event}`;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(msg.payload),
          signal: AbortSignal.timeout(2500),
        });

        if (!response.ok && response.status !== 202) {
          const body = await response.text().catch(() => "");
          failures.push(
            `${msg.topic}/${msg.event}:${response.status}:${body.slice(0, 120)}`,
          );
        }
      } catch (error) {
        failures.push(
          `${msg.topic}/${msg.event}:${error instanceof Error ? error.message : "unknown"}`,
        );
      }
    }),
  );

  const latencyMs = Date.now() - started;
  const ok = failures.length === 0;

  if (!ok) {
    logger.error("postSupabaseBroadcast failed", {
      userIds,
      rentalId: context?.rentalId ?? null,
      latencyMs,
      failures,
      topics: messages.map((m) => m.topic),
    });
  }

  return { ok, latencyMs, failures };
}
