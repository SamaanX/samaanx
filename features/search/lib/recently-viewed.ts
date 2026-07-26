export type RecentlyViewedItem = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  city: string;
  area: string;
  viewedAt: number;
};

const STORAGE_KEY = "samaanx:recently-viewed";
const MAX_ITEMS = 12;

/** Client-only recently viewed — no DB writes. */
export function readRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentlyViewedItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(
  item: Omit<RecentlyViewedItem, "viewedAt">,
): void {
  if (typeof window === "undefined") return;
  try {
    const prev = readRecentlyViewed().filter((row) => row.id !== item.id);
    const next: RecentlyViewedItem[] = [
      { ...item, viewedAt: Date.now() },
      ...prev,
    ].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — ignore.
  }
}
