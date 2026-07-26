import {
  DEFAULT_SEARCH_PAGE_SIZE,
  type MarketplaceSearchFilters,
  SEARCH_SORT_VALUES,
  type SearchSort,
} from "@/domain/search/types";
import { parseNearbyRadius } from "@/lib/geo/coordinates";

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseOptionalNumber(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "") {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseSort(raw: string | undefined): SearchSort {
  if (raw && (SEARCH_SORT_VALUES as readonly string[]).includes(raw)) {
    return raw as SearchSort;
  }
  return "newest";
}

function parseRentUnit(
  raw: string | undefined,
): MarketplaceSearchFilters["rentUnit"] {
  if (raw === "DAY" || raw === "WEEK" || raw === "MONTH") {
    return raw;
  }
  return null;
}

function parseDepositType(
  raw: string | undefined,
): MarketplaceSearchFilters["depositType"] {
  if (
    raw === "NONE" ||
    raw === "FIXED" ||
    raw === "PERCENTAGE" ||
    raw === "REQUIRED"
  ) {
    return raw;
  }
  return null;
}

function parseDateOnly(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }
  return raw;
}

function parseBool(raw: string | undefined): boolean {
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * Parse Next.js `searchParams` into typed marketplace filters.
 */
export function parseMarketplaceSearchParams(
  params: Record<string, string | string[] | undefined>,
): MarketplaceSearchFilters {
  const q = (firstString(params.q) ?? "").trim();
  const categorySlug = (firstString(params.category) ?? "").trim() || null;
  const city = (firstString(params.city) ?? "").trim() || null;
  const area = (firstString(params.area) ?? "").trim() || null;
  const priceMin = parseOptionalNumber(firstString(params.priceMin));
  const priceMax = parseOptionalNumber(firstString(params.priceMax));
  const rentUnit = parseRentUnit(firstString(params.rentUnit));
  const depositType = parseDepositType(firstString(params.deposit));
  const ratingMin = parseOptionalNumber(firstString(params.ratingMin));
  const availableToday = parseBool(firstString(params.availableToday));
  let availableFrom = parseDateOnly(firstString(params.availableFrom));
  let availableTo = parseDateOnly(firstString(params.availableTo));
  if (availableToday) {
    const today = new Date().toISOString().slice(0, 10);
    availableFrom = today;
    availableTo = today;
  }
  const verifiedSellerOnly = parseBool(firstString(params.verified));
  const nearLat = parseOptionalNumber(firstString(params.lat));
  const nearLng = parseOptionalNumber(firstString(params.lng));
  const radiusKm = parseNearbyRadius(
    parseOptionalNumber(firstString(params.radiusKm)),
  );
  let sort = parseSort(firstString(params.sort));
  // Nearest requires a viewer location; otherwise fall back.
  if (
    sort === "nearest" &&
    (nearLat === null ||
      nearLng === null ||
      nearLat < -90 ||
      nearLat > 90 ||
      nearLng < -180 ||
      nearLng > 180)
  ) {
    sort = "newest";
  }
  const pageRaw = parseOptionalNumber(firstString(params.page));
  const page = pageRaw && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const pageSizeRaw = parseOptionalNumber(firstString(params.pageSize));
  const pageSize =
    pageSizeRaw && pageSizeRaw >= 1 && pageSizeRaw <= 48
      ? Math.floor(pageSizeRaw)
      : DEFAULT_SEARCH_PAGE_SIZE;

  return {
    q,
    categorySlug,
    city,
    area,
    priceMin,
    priceMax,
    rentUnit,
    depositType,
    ratingMin:
      ratingMin !== null && ratingMin >= 0 && ratingMin <= 5 ? ratingMin : null,
    availableFrom,
    availableTo,
    availableToday,
    verifiedSellerOnly,
    nearLat:
      nearLat !== null && nearLat >= -90 && nearLat <= 90 ? nearLat : null,
    nearLng:
      nearLng !== null && nearLng >= -180 && nearLng <= 180 ? nearLng : null,
    radiusKm,
    sort,
    page,
    pageSize,
  };
}

/** Build query string for links (omits empty defaults). */
export function toSearchQueryString(
  filters: Partial<MarketplaceSearchFilters>,
  defaults: MarketplaceSearchFilters = parseMarketplaceSearchParams({}),
): string {
  const merged: MarketplaceSearchFilters = { ...defaults, ...filters };
  const sp = new URLSearchParams();

  if (merged.q) sp.set("q", merged.q);
  if (merged.categorySlug) sp.set("category", merged.categorySlug);
  if (merged.city) sp.set("city", merged.city);
  if (merged.area) sp.set("area", merged.area);
  if (merged.priceMin !== null) sp.set("priceMin", String(merged.priceMin));
  if (merged.priceMax !== null) sp.set("priceMax", String(merged.priceMax));
  if (merged.rentUnit) sp.set("rentUnit", merged.rentUnit);
  if (merged.depositType) sp.set("deposit", merged.depositType);
  if (merged.ratingMin !== null) sp.set("ratingMin", String(merged.ratingMin));
  if (merged.availableToday) sp.set("availableToday", "1");
  else {
    if (merged.availableFrom) sp.set("availableFrom", merged.availableFrom);
    if (merged.availableTo) sp.set("availableTo", merged.availableTo);
  }
  if (merged.verifiedSellerOnly) sp.set("verified", "1");
  if (merged.nearLat !== null) sp.set("lat", String(merged.nearLat));
  if (merged.nearLng !== null) sp.set("lng", String(merged.nearLng));
  if (merged.radiusKm !== null) sp.set("radiusKm", String(merged.radiusKm));
  if (merged.sort !== "newest") sp.set("sort", merged.sort);
  if (merged.page > 1) sp.set("page", String(merged.page));
  if (merged.pageSize !== DEFAULT_SEARCH_PAGE_SIZE) {
    sp.set("pageSize", String(merged.pageSize));
  }

  return sp.toString();
}
