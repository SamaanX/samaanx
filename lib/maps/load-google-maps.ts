let loadPromise: Promise<typeof google> | null = null;

/**
 * Lazy-load Google Maps JS API once. Never import from layout/home.
 */
export function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps is browser-only"));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-samaanx-google-maps]",
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.samaanxGoogleMaps = "1";
    script.onload = () => resolve(window.google);
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

declare global {
  interface Window {
    google: typeof google;
  }
}
