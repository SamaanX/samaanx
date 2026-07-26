"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

import { BrandTagline } from "@/components/brand/brand-tagline";
import { SamaanXLogo } from "@/components/brand/samaanx-logo";
import { APP_NAME } from "@/config/constants";
import { SPLASH_SEEN_KEY } from "@/features/auth/lib/welcome-session";

const SPLASH_MS = 1400;

/**
 * Brief first-visit-per-session splash — logo + official tagline.
 * Client-only; does not affect routing or auth.
 */
export function SplashScreen() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      if (sessionStorage.getItem(SPLASH_SEEN_KEY) === "1") {
        return;
      }
    } catch {
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
      } catch {
        // Ignore.
      }
      setVisible(false);
    }, SPLASH_MS);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="splash"
          role="status"
          aria-live="polite"
          aria-label={`${APP_NAME} splash`}
          className="bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="bg-brand-blue/15 absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full blur-3xl" />
            <div className="bg-brand-green/15 absolute right-0 bottom-0 h-64 w-64 translate-x-1/4 translate-y-1/4 rounded-full blur-3xl" />
          </div>

          <motion.div
            className="relative flex flex-col items-center gap-5 px-6 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <SamaanXLogo
              href={null}
              priority
              className="[&_img]:h-10 sm:[&_img]:h-12"
            />
            <BrandTagline
              multiline
              className="text-muted-foreground text-base font-medium sm:text-lg"
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
