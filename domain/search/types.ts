/**
 * Marketplace search domain — filter / sort contracts (no I/O).
 */

export const SEARCH_SORT_VALUES = [
  "newest",
  "popular",
  "highest_rated_seller",
  "price_asc",
  "price_desc",
  "recently_added",
  "nearest",
] as const;

export type SearchSort = (typeof SEARCH_SORT_VALUES)[number];

export const SEARCH_SORT_LABELS: Record<SearchSort, string> = {
  newest: "Newest",
  popular: "Most popular",
  highest_rated_seller: "Highest rated",
  price_asc: "Lowest price",
  price_desc: "Highest price",
  recently_added: "Recently added",
  nearest: "Nearest first",
};

export type MarketplaceSearchFilters = {
  q: string;
  categorySlug: string | null;
  city: string | null;
  area: string | null;
  priceMin: number | null;
  priceMax: number | null;
  rentUnit: "DAY" | "WEEK" | "MONTH" | null;
  depositType: "NONE" | "FIXED" | "PERCENTAGE" | "REQUIRED" | null;
  ratingMin: number | null;
  availableFrom: string | null;
  availableTo: string | null;
  /** ISO date — shorthand for available today window. */
  availableToday: boolean;
  verifiedSellerOnly: boolean;
  /** Viewer lat/lng for nearby (never persisted as listing coords). */
  nearLat: number | null;
  nearLng: number | null;
  radiusKm: number | null;
  sort: SearchSort;
  page: number;
  pageSize: number;
};

export const DEFAULT_SEARCH_PAGE_SIZE = 24;
