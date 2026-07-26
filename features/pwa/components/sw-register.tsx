"use client";

import * as React from "react";

/** Register SW for offline shell + push — does not cache rental/chat state. */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* graceful no-op */
    });
  }, []);

  return null;
}
