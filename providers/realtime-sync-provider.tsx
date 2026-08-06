"use client";

import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { bumpLiveSurfaces } from "@/features/realtime/live-sync";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";
import { ChatRealtimeHost } from "@/providers/chat-realtime-host";
import { PresenceHost } from "@/providers/presence-host";

export const REALTIME_RENTAL_EVENT = "samaanx:rental-sync";

type RealtimeSyncProviderProps = {
  userId: string | null;
  children: React.ReactNode;
};

/**
 * Global live sync for authenticated users.
 * Primary: Broadcast on `live-sync:{userId}` (instant, RLS-independent).
 * Backup: postgres_changes on rentals / notifications / confirmations / listings.
 */
export function RealtimeSyncProvider({
  userId,
  children,
}: RealtimeSyncProviderProps) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!userId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const bump = (rentalId?: string | null) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        bumpLiveSurfaces(queryClient, [
          "rentals",
          "activity",
          "notifications",
          "chatStatus",
          "verification",
        ]);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(REALTIME_RENTAL_EVENT, {
              detail: { rentalId: rentalId ?? null },
            }),
          );
        }
      }, 160);
    };

    const supabase = createClient();

    // --- Primary: Broadcast wake-up (peer mutations + server wakeUsersLiveSync) ---
    const broadcastChannel = supabase.channel(`live-sync:${userId}`, {
      config: { broadcast: { self: true } },
    });
    broadcastChannel.on("broadcast", { event: "sync" }, ({ payload }) => {
      const rentalId =
        payload &&
        typeof payload === "object" &&
        "rentalId" in payload &&
        typeof (payload as { rentalId?: unknown }).rentalId === "string"
          ? (payload as { rentalId: string }).rentalId
          : null;
      bump(rentalId);
    });
    broadcastChannel.subscribe();

    // --- Backup: Postgres Changes ---
    const pgChannel = supabase
      .channel(`samaanx-pg:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rentals",
          filter: `buyer_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            { id?: string } | undefined;
          bump(typeof row?.id === "string" ? row.id : null);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rentals",
          filter: `seller_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            { id?: string } | undefined;
          bump(typeof row?.id === "string" ? row.id : null);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rental_confirmations",
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            { rental_id?: string } | undefined;
          bump(typeof row?.rental_id === "string" ? row.rental_id : null);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            | {
                rental_id?: string;
                payload?: { rentalId?: string } | null;
              }
            | undefined;
          const payloadRentalId =
            row?.payload &&
            typeof row.payload === "object" &&
            "rentalId" in row.payload &&
            typeof row.payload.rentalId === "string"
              ? row.payload.rentalId
              : null;
          const rentalId =
            typeof row?.rental_id === "string"
              ? row.rental_id
              : payloadRentalId;

          if (rentalId) {
            bump(rentalId);
            return;
          }

          void queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.all,
            refetchType: "active",
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
          filter: `seller_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.sellerListings.all,
            refetchType: "active",
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.activity.all,
            refetchType: "active",
          });
        },
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(broadcastChannel);
      void supabase.removeChannel(pgChannel);
    };
  }, [userId, queryClient]);

  return (
    <>
      <PresenceHost userId={userId}>
        <ChatRealtimeHost userId={userId} />
        {children}
      </PresenceHost>
    </>
  );
}

/** Hook for screens that keep local verification state. */
export function useRealtimeRentalSync(
  onSync: (rentalId: string | null) => void,
  rentalId?: string | null,
) {
  const onSyncRef = React.useRef(onSync);
  onSyncRef.current = onSync;

  React.useEffect(() => {
    function handler(event: Event) {
      const detail = (event as CustomEvent<{ rentalId: string | null }>).detail;
      const changedId = detail?.rentalId ?? null;
      if (rentalId && changedId && changedId !== rentalId) return;
      onSyncRef.current(changedId);
    }
    function liveHandler() {
      onSyncRef.current(rentalId ?? null);
    }
    window.addEventListener(REALTIME_RENTAL_EVENT, handler);
    window.addEventListener("samaanx:live-sync", liveHandler);
    return () => {
      window.removeEventListener(REALTIME_RENTAL_EVENT, handler);
      window.removeEventListener("samaanx:live-sync", liveHandler);
    };
  }, [rentalId]);
}
