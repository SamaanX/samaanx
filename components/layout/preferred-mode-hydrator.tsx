"use client";

import * as React from "react";

import type { AppUiMode } from "@/lib/ui/app-mode";
import { usePreferredMode } from "@/providers/preferred-mode-provider";

/** Sync server preferredMode into client provider without remounting the tree. */
export function PreferredModeHydrator({ mode }: { mode: AppUiMode }) {
  const { setMode } = usePreferredMode();

  React.useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  return null;
}
