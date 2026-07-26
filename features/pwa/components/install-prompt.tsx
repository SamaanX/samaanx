"use client";

import { Download } from "lucide-react";
import * as React from "react";

import { trackEvent } from "@/lib/analytics/events";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallPrompt() {
  const [deferred, setDeferred] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setDismissed(localStorage.getItem("pwa-install-dismissed") === "1");
    } catch {
      /* ignore */
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      trackEvent("pwa_install");
      setDeferred(null);
    }
  }

  function dismiss() {
    setDismissed(true);
    setDeferred(null);
    try {
      localStorage.setItem("pwa-install-dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  if (!deferred || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Install app"
      className="border-border/70 bg-card fixed right-4 bottom-4 left-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border p-4 shadow-lg sm:right-6 sm:left-auto"
    >
      <Download className="text-brand-blue size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install SamaanX</p>
        <p className="text-muted-foreground text-xs">
          Add to your home screen for quick access.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void install()}
        className="bg-brand-gradient shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="text-muted-foreground shrink-0 text-xs"
        aria-label="Dismiss install prompt"
      >
        ✕
      </button>
    </div>
  );
}
