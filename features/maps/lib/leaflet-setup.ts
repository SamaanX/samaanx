import L from "leaflet";

let configured = false;

/** Fix webpack-broken default marker assets for Leaflet. */
export function ensureLeafletIcons(): void {
  if (configured || typeof window === "undefined") return;

  const iconRetinaUrl =
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png";
  const iconUrl =
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png";
  const shadowUrl =
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";

  const proto = L.Icon.Default.prototype as L.Icon.Default & {
    _getIconUrl?: unknown;
  };
  delete proto._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
  });

  configured = true;
}
