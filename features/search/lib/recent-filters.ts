const STORAGE_KEY = "samaanx:recent-filters";
const MAX = 5;

export type RecentFilterSnapshot = {
  label: string;
  href: string;
  at: string;
};

export function getRecentFilters(): RecentFilterSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentFilterSnapshot[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function addRecentFilter(
  snapshot: Omit<RecentFilterSnapshot, "at">,
): void {
  const prev = getRecentFilters().filter((item) => item.href !== snapshot.href);
  const next: RecentFilterSnapshot[] = [
    { ...snapshot, at: new Date().toISOString() },
    ...prev,
  ].slice(0, MAX);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
