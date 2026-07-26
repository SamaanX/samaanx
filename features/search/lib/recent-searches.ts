"use client";

const STORAGE_KEY = "samaanx:recent-searches";
const MAX = 8;

export type RecentSearch = {
  q: string;
  city?: string;
  at: string;
};

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSearch[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(q: string, city?: string): void {
  const term = q.trim();
  if (!term || term.length < 2) return;
  const prev = getRecentSearches().filter(
    (item) => item.q.toLowerCase() !== term.toLowerCase(),
  );
  const next: RecentSearch[] = [
    { q: term, city, at: new Date().toISOString() },
    ...prev,
  ].slice(0, MAX);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Static trending placeholders — replace with analytics-driven data later. */
export const TRENDING_SEARCHES = [
  "DSLR camera",
  "Projector",
  "Camping tent",
  "Power tools",
  "PlayStation",
  "Drone",
] as const;
