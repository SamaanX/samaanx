"use client";

import * as React from "react";

import { RealtimeSyncProvider } from "@/providers/realtime-sync-provider";

type RealtimeUserContextValue = {
  userId: string | null;
  setUserId: (userId: string | null) => void;
};

const RealtimeUserContext =
  React.createContext<RealtimeUserContextValue | null>(null);

/** Root bridge: starts with null userId so layout chrome can stream first. */
export function RealtimeUserBridge({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userId, setUserId] = React.useState<string | null>(null);
  const value = React.useMemo(() => ({ userId, setUserId }), [userId]);

  return (
    <RealtimeUserContext.Provider value={value}>
      <RealtimeSyncProvider userId={userId}>{children}</RealtimeSyncProvider>
    </RealtimeUserContext.Provider>
  );
}

/** Hydrate authenticated userId as early as possible (before paint). */
export function RealtimeUserHydrator({ userId }: { userId: string | null }) {
  const ctx = React.useContext(RealtimeUserContext);

  React.useLayoutEffect(() => {
    ctx?.setUserId(userId);
  }, [ctx, userId]);

  return null;
}
