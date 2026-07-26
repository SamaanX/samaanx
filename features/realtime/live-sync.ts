import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";

export const LIVE_SYNC_EVENT = "samaanx:live-sync";

export type LiveSurface =
  | "rentals"
  | "activity"
  | "notifications"
  | "chatStatus"
  | "verification"
  | "sellerListings";

const DEFAULT_SURFACES: LiveSurface[] = [
  "rentals",
  "activity",
  "notifications",
  "chatStatus",
  "verification",
];

/**
 * Targeted cache bump for marketplace surfaces.
 * Pass an explicit surface list after local mutations when possible.
 */
export function bumpLiveSurfaces(
  queryClient: QueryClient,
  surfaces: LiveSurface[] = DEFAULT_SURFACES,
): void {
  const set = new Set(surfaces);

  if (process.env.NODE_ENV === "development") {
    console.warn(
      JSON.stringify({
        level: "debug",
        message: "query.invalidate",
        surfaces: [...set],
        timestamp: new Date().toISOString(),
      }),
    );
  }

  if (set.has("rentals")) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.rentals.all,
      refetchType: "active",
    });
  }
  if (set.has("activity")) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.activity.all,
      refetchType: "active",
    });
  }
  if (set.has("notifications")) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all,
      refetchType: "active",
    });
  }
  if (set.has("sellerListings")) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sellerListings.all,
      refetchType: "active",
    });
  }
  if (set.has("chatStatus")) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.chat.inbox(),
      refetchType: "active",
    });
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "chat" && key[1] === "thread";
      },
      refetchType: "active",
    });
  }
  if (set.has("verification")) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.verification.all,
      refetchType: "active",
    });
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LIVE_SYNC_EVENT));
    window.dispatchEvent(
      new CustomEvent("samaanx:rental-sync", {
        detail: { rentalId: null },
      }),
    );
  }
}

/**
 * Push an instant wake-up to another user's open clients via Supabase Broadcast.
 * Postgres Changes remain as backup; Broadcast does not depend on RLS filters.
 */
export async function notifyUsersLiveSync(
  userIds: Array<string | null | undefined>,
  options?: { rentalId?: string | null },
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean) as string[])];
  if (unique.length === 0) return;

  const supabase = createClient();
  const payload = {
    at: new Date().toISOString(),
    rentalId: options?.rentalId ?? null,
  };

  await Promise.all(
    unique.map(
      (userId) =>
        new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            void supabase.removeChannel(channel);
            resolve();
          };

          const channel = supabase.channel(`live-sync:${userId}`, {
            config: { broadcast: { self: false } },
          });

          channel.subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await channel.send({
                type: "broadcast",
                event: "sync",
                payload,
              });
              finish();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              finish();
            }
          });

          window.setTimeout(finish, 2000);
        }),
    ),
  );
}

/** After a local mutation: refresh own cache + wake peers. */
export function afterLiveMutation(
  queryClient: QueryClient,
  peerUserIds: Array<string | null | undefined>,
  options?: { rentalId?: string | null; surfaces?: LiveSurface[] },
): void {
  bumpLiveSurfaces(queryClient, options?.surfaces);
  void notifyUsersLiveSync(peerUserIds, options);
}
