"use client";

import * as React from "react";

import { touchLastSeenAction } from "@/features/chat/actions/chat-actions";
import { createClient } from "@/lib/supabase/client";

type PresenceContextValue = {
  onlineIds: ReadonlySet<string>;
};

const PresenceContext = React.createContext<PresenceContextValue>({
  onlineIds: new Set(),
});

/** App-wide Supabase presence — not limited to the chat page. */
export function PresenceHost({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const [onlineIds, setOnlineIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  React.useEffect(() => {
    if (!userId) {
      setOnlineIds(new Set());
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel("samaanx-presence", {
      config: { presence: { key: userId } },
    });

    const applySync = () => {
      const state = channel.presenceState<{ userId?: string }>();
      const next = new Set<string>();
      for (const metas of Object.values(state)) {
        for (const meta of metas) {
          if (meta.userId) next.add(meta.userId);
        }
      }
      next.add(userId);
      setOnlineIds(next);
    };

    channel.on("presence", { event: "sync" }, applySync);
    channel.on("presence", { event: "join" }, applySync);
    channel.on("presence", { event: "leave" }, applySync);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId,
          online_at: new Date().toISOString(),
        });
        void touchLastSeenAction();
        applySync();
      }
    });

    const heartbeat = window.setInterval(() => {
      void touchLastSeenAction();
    }, 30_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void touchLastSeenAction();
        void channel.track({
          userId,
          online_at: new Date().toISOString(),
        });
      } else {
        void touchLastSeenAction();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      void channel.untrack();
      void supabase.removeChannel(channel);
      void touchLastSeenAction();
    };
  }, [userId]);

  const value = React.useMemo(() => ({ onlineIds }), [onlineIds]);

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceOnline(peerId?: string | null): boolean {
  const { onlineIds } = React.useContext(PresenceContext);
  return peerId ? onlineIds.has(peerId) : false;
}

export function usePresenceOnlineIds(): ReadonlySet<string> {
  return React.useContext(PresenceContext).onlineIds;
}
