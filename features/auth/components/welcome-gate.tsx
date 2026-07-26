"use client";

import * as React from "react";

import {
  markWelcomePending,
  peekWelcomePending,
} from "@/features/auth/lib/welcome-session";

import { WelcomeScreen } from "./welcome-screen";

type WelcomeGateProps = {
  isAuthenticated: boolean;
};

/**
 * Post-auth rent/sell chooser — reads session flag synchronously (no extra Suspense/DB wait).
 */
export function WelcomeGate({ isAuthenticated }: WelcomeGateProps) {
  const [show, setShow] = React.useState(false);

  React.useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      markWelcomePending();
      params.delete("welcome");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}`,
      );
    }
    setShow(isAuthenticated && peekWelcomePending());
  }, [isAuthenticated]);

  if (!show) return null;

  return <WelcomeScreen />;
}
