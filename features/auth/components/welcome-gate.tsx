"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { peekWelcomePending } from "@/features/auth/lib/welcome-session";
import type { ProfileViewModel } from "@/features/profile/types/profile";

const WelcomeScreen = dynamic(
  () =>
    import("@/features/auth/components/welcome-screen").then(
      (mod) => mod.WelcomeScreen,
    ),
  { ssr: false },
);

type WelcomeProfile = Pick<
  ProfileViewModel,
  "displayName" | "phone" | "bio" | "city" | "area"
>;

type WelcomeGateProps = {
  profile: WelcomeProfile | null;
};

/**
 * Shows the post-auth welcome overlay when a client session flag is set.
 * Dynamically loads WelcomeScreen (framer-motion) only when needed.
 */
export function WelcomeGate({ profile }: WelcomeGateProps) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (!profile) {
      setShow(false);
      return;
    }
    setShow(peekWelcomePending());
  }, [profile]);

  if (!show || !profile) {
    return null;
  }

  return <WelcomeScreen profile={profile} />;
}
