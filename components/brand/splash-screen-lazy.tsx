"use client";

import dynamic from "next/dynamic";

const SplashScreen = dynamic(
  () =>
    import("@/components/brand/splash-screen").then((mod) => mod.SplashScreen),
  { ssr: false },
);

/** Defers framer-motion splash off the critical server render path. */
export function SplashScreenLazy() {
  return <SplashScreen />;
}
