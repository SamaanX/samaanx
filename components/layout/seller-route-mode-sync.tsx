"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

import { usePreferredMode } from "@/providers/preferred-mode-provider";

/**
 * Seller routes always render in Seller mode.
 * Fixes layout swap (marketplace → app) resetting PreferredModeProvider to BUYER.
 */
export function SellerRouteModeSync() {
  const pathname = usePathname();
  const { setMode } = usePreferredMode();

  React.useLayoutEffect(() => {
    if (pathname.startsWith("/seller")) {
      setMode("SELLER");
    }
  }, [pathname, setMode]);

  return null;
}
