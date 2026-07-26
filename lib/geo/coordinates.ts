/** Earth radius in kilometers (mean). */
export const EARTH_RADIUS_KM = 6371;

/** Approximate public pin accuracy band (~400m). */
export const APPROX_OFFSET_DEG = 0.0036;

export const NEARBY_RADIUS_KM = [5, 10, 25, 50, 100] as const;
export type NearbyRadiusKm = (typeof NEARBY_RADIUS_KM)[number];

export type LatLng = { lat: number; lng: number };

export type PublicLocationPrecision = "exact" | "approximate";

/** Deterministic 0–1 hash from listing id (stable approximate pin). */
function stableUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * Approximate public coordinates (~300–500m). Never use for distance ranking.
 */
export function approximateCoordinates(
  lat: number,
  lng: number,
  listingId: string,
): LatLng {
  const u = stableUnit(listingId);
  const v = stableUnit(`${listingId}:lng`);
  const angle = u * Math.PI * 2;
  const radius = APPROX_OFFSET_DEG * (0.65 + v * 0.35);
  const latRad = (lat * Math.PI) / 180;
  const dLat = radius * Math.cos(angle);
  const dLng = (radius * Math.sin(angle)) / Math.max(0.2, Math.cos(latRad));
  return {
    lat: clamp(lat + dLat, -90, 90),
    lng: clamp(lng + dLng, -180, 180),
  };
}

export function resolvePublicCoordinates(params: {
  lat: number;
  lng: number;
  listingId: string;
  showExactPickup: boolean;
  isOwner: boolean;
}): LatLng & { precision: PublicLocationPrecision } {
  if (params.isOwner || params.showExactPickup) {
    return {
      lat: params.lat,
      lng: params.lng,
      precision: "exact",
    };
  }
  const approx = approximateCoordinates(
    params.lat,
    params.lng,
    params.listingId,
  );
  return { ...approx, precision: "approximate" };
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Bounding box for DB prefilter before Haversine (degrees). */
export function boundingBox(
  center: LatLng,
  radiusKm: number,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusKm / 111.32;
  const lngDelta =
    radiusKm / (111.32 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
  return {
    minLat: clamp(center.lat - latDelta, -90, 90),
    maxLat: clamp(center.lat + latDelta, -90, 90),
    minLng: clamp(center.lng - lngDelta, -180, 180),
    maxLng: clamp(center.lng + lngDelta, -180, 180),
  };
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.max(100, Math.round(km * 1000))} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseNearbyRadius(raw: number | null): NearbyRadiusKm | null {
  if (raw === null) return null;
  if ((NEARBY_RADIUS_KM as readonly number[]).includes(raw)) {
    return raw as NearbyRadiusKm;
  }
  return null;
}
