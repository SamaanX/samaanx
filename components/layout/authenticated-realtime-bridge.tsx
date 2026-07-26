"use client";

import type { ReactNode } from "react";

import { RealtimeSyncProvider } from "@/providers/realtime-sync-provider";

type AuthenticatedRealtimeBridgeProps = {
  userId: string | null;
  children: ReactNode;
};

export function AuthenticatedRealtimeBridge({
  userId,
  children,
}: AuthenticatedRealtimeBridgeProps) {
  return (
    <RealtimeSyncProvider userId={userId}>{children}</RealtimeSyncProvider>
  );
}
