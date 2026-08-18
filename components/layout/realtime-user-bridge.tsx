"use client";

import * as React from "react";

import {
  AutoPushPrompt,
  PushPromptUrlHydrator,
} from "@/features/notifications/components/auto-push-prompt";
import { RealtimeSyncProvider } from "@/providers/realtime-sync-provider";

type RealtimeUserContextValue = {
  userId: string | null;
  setUserId: (userId: string | null) => void;
};

const RealtimeUserContext =
  React.createContext<RealtimeUserContextValue | null>(null);

/**
 * Root bridge: receives server-resolved userId so Realtime channels subscribe
 * on the first client paint (no delayed hydration gap).
 */
export function RealtimeUserBridge({
  children,
  initialUserId = null,
}: {
  children: React.ReactNode;
  initialUserId?: string | null;
}) {
  const [userId, setUserId] = React.useState(initialUserId);

  React.useLayoutEffect(() => {
    setUserId(initialUserId);
  }, [initialUserId]);

  const value = React.useMemo(() => ({ userId, setUserId }), [userId]);

  return (
    <RealtimeUserContext.Provider value={value}>
      <RealtimeSyncProvider userId={userId}>
        <PushPromptUrlHydrator />
        <AutoPushPrompt userId={userId} />
        {children}
      </RealtimeSyncProvider>
    </RealtimeUserContext.Provider>
  );
}

/** Keep userId in sync when auth header streams a profile id. */
export function RealtimeUserHydrator({ userId }: { userId: string | null }) {
  const ctx = React.useContext(RealtimeUserContext);

  React.useLayoutEffect(() => {
    ctx?.setUserId(userId);
  }, [ctx, userId]);

  return null;
}
