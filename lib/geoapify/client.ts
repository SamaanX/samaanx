import { parseGeoapifyFeature } from "@/lib/geoapify/parse";
import type {
  GeoapifyAutocompleteSuggestion,
  GeoapifyFeatureCollection,
  ParsedGeoAddress,
} from "@/lib/geoapify/types";

const GEOAPIFY_BASE = "https://api.geoapify.com/v1/geocode";
const CACHE_MAX = 64;

const responseCache = new Map<string, unknown>();
const inflight = new Map<string, AbortController>();

export function getGeoapifyApiKey(): string {
  return process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY?.trim() ?? "";
}

export function isGeoapifyConfigured(): boolean {
  return getGeoapifyApiKey().length > 0;
}

function cacheGet<T>(key: string): T | undefined {
  const value = responseCache.get(key);
  return value as T | undefined;
}

function cacheSet(key: string, value: unknown): void {
  if (responseCache.size >= CACHE_MAX) {
    const first = responseCache.keys().next().value;
    if (first) responseCache.delete(first);
  }
  responseCache.set(key, value);
}

async function geoapifyGet<T>(
  path: string,
  params: Record<string, string>,
  cacheKey: string,
  signal?: AbortSignal,
): Promise<T | null> {
  const apiKey = getGeoapifyApiKey();
  if (!apiKey) return null;

  const cached = cacheGet<T>(cacheKey);
  if (cached) return cached;

  const existing = inflight.get(cacheKey);
  existing?.abort();

  const controller = new AbortController();
  inflight.set(cacheKey, controller);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  const query = new URLSearchParams({ ...params, apiKey });
  const url = `${GEOAPIFY_BASE}/${path}?${query.toString()}`;

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as T;
    cacheSet(cacheKey, data);
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    return null;
  } finally {
    inflight.delete(cacheKey);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function fetchAutocompleteSuggestions(
  text: string,
  options?: { signal?: AbortSignal; limit?: number },
): Promise<GeoapifyAutocompleteSuggestion[]> {
  const query = text.trim();
  if (query.length < 2) return [];

  const limit = String(options?.limit ?? 6);
  const cacheKey = `autocomplete:${query.toLowerCase()}:${limit}`;

  const data = await geoapifyGet<GeoapifyFeatureCollection>(
    "autocomplete",
    {
      text: query,
      limit,
      filter: "country:pk",
      lang: "en",
    },
    cacheKey,
    options?.signal,
  );

  if (!data?.features?.length) return [];

  return data.features
    .map((feature, index) => {
      const address = parseGeoapifyFeature(feature);
      if (!address) return null;
      const label =
        feature.properties.formatted?.trim() ||
        `${address.area}, ${address.city}`;
      return {
        id: `${label}-${address.lat}-${address.lng}-${index}`,
        label,
        address,
      };
    })
    .filter((item): item is GeoapifyAutocompleteSuggestion => item !== null);
}

export async function forwardGeocode(
  text: string,
  options?: { signal?: AbortSignal },
): Promise<ParsedGeoAddress | null> {
  const query = text.trim();
  if (!query) return null;

  const cacheKey = `forward:${query.toLowerCase()}`;
  const data = await geoapifyGet<GeoapifyFeatureCollection>(
    "search",
    {
      text: query,
      filter: "country:pk",
      lang: "en",
      limit: "1",
    },
    cacheKey,
    options?.signal,
  );

  const feature = data?.features?.[0];
  return feature ? parseGeoapifyFeature(feature) : null;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  options?: { signal?: AbortSignal },
): Promise<ParsedGeoAddress | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const roundedLat = lat.toFixed(5);
  const roundedLng = lng.toFixed(5);
  const cacheKey = `reverse:${roundedLat},${roundedLng}`;

  const data = await geoapifyGet<GeoapifyFeatureCollection>(
    "reverse",
    {
      lat: roundedLat,
      lon: roundedLng,
      lang: "en",
      limit: "1",
    },
    cacheKey,
    options?.signal,
  );

  const feature = data?.features?.[0];
  return feature ? parseGeoapifyFeature(feature) : null;
}

export function buildOpenStreetMapUrl(
  lat: number,
  lng: number,
  zoom = 16,
): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}
