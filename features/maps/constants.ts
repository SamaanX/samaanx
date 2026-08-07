import type { LatLng } from "@/lib/geo/coordinates";

/** Default map center — Karachi, Pakistan. */
export const DEFAULT_MAP_CENTER: LatLng = {
  lat: 24.8607,
  lng: 67.0011,
};

export const OSM_TILE_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const APPROXIMATE_RADIUS_METERS = 400;

export const AUTOCOMPLETE_DEBOUNCE_MS = 400;
