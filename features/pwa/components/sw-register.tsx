"use client";

import * as React from "react";

/** Register SW for push — forces update so stale fetch handlers are replaced. */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        void registration.update();
      })
      .catch(() => {
        /* graceful no-op */
      });
  }, []);

  return null;
}
