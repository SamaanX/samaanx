"use client";

import * as React from "react";

import type { AppUiMode } from "@/lib/ui/app-mode";
import { usePreferredMode } from "@/providers/preferred-mode-provider";

type HomeModeShellProps = {
  preferredMode: AppUiMode;
  buyer: React.ReactNode;
  seller: React.ReactNode;
};

/** Instant Buyer/Seller home switch — no router.refresh / layout reload. */
export function HomeModeShell({
  preferredMode,
  buyer,
  seller,
}: HomeModeShellProps) {
  const { mode } = usePreferredMode(preferredMode);
  return <>{mode === "SELLER" ? seller : buyer}</>;
}
