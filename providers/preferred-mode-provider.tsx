"use client";

import * as React from "react";

import type { AppUiMode } from "@/lib/ui/app-mode";

type PreferredModeContextValue = {
  mode: AppUiMode;
  setMode: (mode: AppUiMode) => void;
};

const PreferredModeContext =
  React.createContext<PreferredModeContextValue | null>(null);

type PreferredModeProviderProps = {
  initialMode: AppUiMode;
  children: React.ReactNode;
};

/** Client-held preferred mode so chrome/nav update instantly without RSC refresh. */
export function PreferredModeProvider({
  initialMode,
  children,
}: PreferredModeProviderProps) {
  const [mode, setMode] = React.useState(initialMode);

  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const value = React.useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <PreferredModeContext.Provider value={value}>
      {children}
    </PreferredModeContext.Provider>
  );
}

export function usePreferredMode(
  fallback: AppUiMode = "BUYER",
): PreferredModeContextValue {
  const ctx = React.useContext(PreferredModeContext);
  if (!ctx) {
    return {
      mode: fallback,
      setMode: () => undefined,
    };
  }
  return ctx;
}
