"use client";

import Link from "next/link";
import * as React from "react";

import {
  getRecentFilters,
  type RecentFilterSnapshot,
} from "@/features/search/lib/recent-filters";
import {
  addRecentSearch,
  getRecentSearches,
  type RecentSearch,
  TRENDING_SEARCHES,
} from "@/features/search/lib/recent-searches";
import { trackEvent } from "@/lib/analytics/events";

type SearchSuggestionsProps = {
  categories?: Array<{ name: string; slug: string }>;
  currentQuery?: string;
  currentCity?: string;
};

export function SearchSuggestions({
  categories = [],
  currentQuery,
  currentCity,
}: SearchSuggestionsProps) {
  const [recent, setRecent] = React.useState<RecentSearch[]>([]);
  const [recentFilters, setRecentFilters] = React.useState<
    RecentFilterSnapshot[]
  >([]);

  React.useEffect(() => {
    setRecent(getRecentSearches());
    setRecentFilters(getRecentFilters());
    if (currentQuery?.trim()) {
      addRecentSearch(currentQuery, currentCity);
      setRecent(getRecentSearches());
    }
  }, [currentQuery, currentCity]);

  if (recent.length === 0 && categories.length === 0) {
    return (
      <section aria-label="Trending searches" className="space-y-2">
        <h2 className="text-sm font-semibold">Trending</h2>
        <div className="flex flex-wrap gap-2">
          {TRENDING_SEARCHES.map((term) => (
            <Link
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              onClick={() =>
                trackEvent("search", { source: "trending", q: term })
              }
              className="border-border/70 bg-card hover:border-brand-blue/40 rounded-full border px-3 py-1 text-xs font-medium"
            >
              {term}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {recent.length > 0 ? (
        <section aria-label="Recent searches">
          <h2 className="text-sm font-semibold">Recent searches</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {recent.map((item) => (
              <li key={`${item.q}-${item.at}`}>
                <Link
                  href={`/search?q=${encodeURIComponent(item.q)}${item.city ? `&city=${encodeURIComponent(item.city)}` : ""}`}
                  className="border-border/70 bg-card hover:border-brand-blue/40 rounded-full border px-3 py-1 text-xs font-medium"
                >
                  {item.q}
                  {item.city ? ` · ${item.city}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {categories.length > 0 ? (
        <section aria-label="Popular categories">
          <h2 className="text-sm font-semibold">Popular categories</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {categories.slice(0, 8).map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={`/categories/${cat.slug}`}
                  className="border-border/70 bg-card hover:border-brand-blue/40 rounded-full border px-3 py-1 text-xs font-medium"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recentFilters.length > 0 ? (
        <section aria-label="Recent filters">
          <h2 className="text-sm font-semibold">Recent filters</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {recentFilters.map((item) => (
              <li key={`${item.href}-${item.at}`}>
                <Link
                  href={item.href}
                  className="border-border/70 bg-card hover:border-brand-blue/40 rounded-full border px-3 py-1 text-xs font-medium"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
