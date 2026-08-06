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

/**
 * Push events to Supabase Realtime via HTTP per-event broadcast API.
 * Uses POST /realtime/v1/api/broadcast/{topic}/events/{event}
 */
export async function postSupabaseBroadcast(
  messages: BroadcastMessage[],
): Promise<BroadcastResult> {
  if (messages.length === 0) {
    return { ok: true, latencyMs: 0, failures: [] };
  }

  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) {
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
      latencyMs,
      failures,
      topics: messages.map((m) => m.topic),
    });
  } else if (process.env.PERF_CHAT === "1") {
    logger.info("postSupabaseBroadcast ok", {
      latencyMs,
      topics: messages.map((m) => m.topic),
    });
  }

  return { ok, latencyMs, failures };
}
