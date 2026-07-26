"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type MarketplaceSearchFilters,
  SEARCH_SORT_LABELS,
  SEARCH_SORT_VALUES,
  toSearchQueryString,
} from "@/domain/search";
import { addRecentFilter } from "@/features/search/lib/recent-filters";
import { addRecentSearch } from "@/features/search/lib/recent-searches";
import type { CategoryBrowseItem } from "@/features/search/types/marketplace";
import { trackEvent } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-[var(--rp-shadow-xs)] outline-none transition-[border-color,box-shadow] duration-200",
  "hover:border-brand-blue/35 focus-visible:border-brand-blue focus-visible:ring-3 focus-visible:ring-brand-blue/25",
  "dark:focus-visible:border-brand-green dark:focus-visible:ring-brand-green/30",
);

type SearchFiltersProps = {
  initial: MarketplaceSearchFilters;
  categories: CategoryBrowseItem[];
  cities: string[];
  compact?: boolean;
};

export function SearchFilters({
  initial,
  categories,
  cities,
  compact = false,
}: SearchFiltersProps) {
  const router = useRouter();
  const [q, setQ] = React.useState(initial.q);
  const filtersRef = React.useRef(initial);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setQ(initial.q);
    filtersRef.current = initial;
  }, [initial]);

  function navigate(next: Partial<MarketplaceSearchFilters>) {
    const query = toSearchQueryString({
      ...filtersRef.current,
      ...next,
      page: 1,
    });
    const href = query ? `/search?${query}` : "/search";
    if (next.q?.trim()) {
      addRecentSearch(
        next.q.trim(),
        next.city ?? filtersRef.current.city ?? undefined,
      );
      trackEvent("search", { source: "filter", q: next.q.trim() });
    }
    router.push(href);
  }

  function onKeywordChange(value: string) {
    setQ(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      navigate({ q: value.trim() });
    }, 350);
  }

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const radiusRaw = String(form.get("radiusKm") || "");
    const nextFilters = {
      q: String(form.get("q") ?? "").trim(),
      categorySlug: String(form.get("category") || "") || null,
      city: String(form.get("city") || "") || null,
      area: String(form.get("area") || "") || null,
      priceMin: form.get("priceMin") ? Number(form.get("priceMin")) : null,
      priceMax: form.get("priceMax") ? Number(form.get("priceMax")) : null,
      rentUnit: (String(form.get("rentUnit") || "") ||
        null) as MarketplaceSearchFilters["rentUnit"],
      depositType: (String(form.get("deposit") || "") ||
        null) as MarketplaceSearchFilters["depositType"],
      ratingMin: form.get("ratingMin") ? Number(form.get("ratingMin")) : null,
      availableToday: form.get("availableToday") === "1",
      availableFrom: String(form.get("availableFrom") || "") || null,
      availableTo: String(form.get("availableTo") || "") || null,
      verifiedSellerOnly: form.get("verified") === "1",
      nearLat: filtersRef.current.nearLat,
      nearLng: filtersRef.current.nearLng,
      radiusKm: radiusRaw ? Number(radiusRaw) : null,
      sort: (String(form.get("sort") || "newest") ||
        "newest") as MarketplaceSearchFilters["sort"],
    };
    const query = toSearchQueryString({
      ...filtersRef.current,
      ...nextFilters,
      page: 1,
    });
    const href = query ? `/search?${query}` : "/search";
    addRecentFilter({
      label: nextFilters.q || nextFilters.city || "Filtered search",
      href,
    });
    trackEvent("filter_apply", {
      has_category: Boolean(nextFilters.categorySlug),
      has_city: Boolean(nextFilters.city),
    });
    router.push(href);
  }

  function useNearMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        navigate({
          nearLat: pos.coords.latitude,
          nearLng: pos.coords.longitude,
          radiusKm: filtersRef.current.radiusKm ?? 10,
          sort: "nearest",
        });
      },
      () => {
        // Graceful no-op — app must never block.
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border-border/80 bg-card space-y-4 rounded-2xl border p-4 shadow-[var(--rp-shadow-sm)] sm:p-5"
    >
      <div className="relative">
        <Label htmlFor="search-q" className="sr-only">
          Keyword
        </Label>
        <Search
          className="text-brand-blue pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          id="search-q"
          name="q"
          value={q}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="Search cameras, bikes, tools…"
          className="h-12 rounded-xl pl-10"
          autoComplete="off"
        />
      </div>

      <div
        className={
          compact
            ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
            : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        <Field label="Category" htmlFor="search-category">
          <select
            id="search-category"
            name="category"
            defaultValue={initial.categorySlug ?? ""}
            className={selectClassName}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="City" htmlFor="search-city">
          <select
            id="search-city"
            name="city"
            defaultValue={initial.city ?? ""}
            className={selectClassName}
          >
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Area" htmlFor="search-area">
          <Input
            id="search-area"
            name="area"
            defaultValue={initial.area ?? ""}
            placeholder="e.g. Gulberg"
            className="h-11"
          />
        </Field>

        <Field label="Price min" htmlFor="search-price-min">
          <Input
            id="search-price-min"
            name="priceMin"
            type="number"
            min={0}
            defaultValue={initial.priceMin ?? ""}
            placeholder="0"
            className="h-11"
          />
        </Field>

        <Field label="Price max" htmlFor="search-price-max">
          <Input
            id="search-price-max"
            name="priceMax"
            type="number"
            min={0}
            defaultValue={initial.priceMax ?? ""}
            placeholder="Any"
            className="h-11"
          />
        </Field>

        <Field label="Rent unit" htmlFor="search-rent-unit">
          <select
            id="search-rent-unit"
            name="rentUnit"
            defaultValue={initial.rentUnit ?? ""}
            className={selectClassName}
          >
            <option value="">Any</option>
            <option value="DAY">Per day</option>
            <option value="WEEK">Per week</option>
            <option value="MONTH">Per month</option>
          </select>
        </Field>

        <Field label="Deposit" htmlFor="search-deposit">
          <select
            id="search-deposit"
            name="deposit"
            defaultValue={initial.depositType ?? ""}
            className={selectClassName}
          >
            <option value="">Any</option>
            <option value="NONE">No deposit</option>
            <option value="REQUIRED">Deposit required</option>
            <option value="FIXED">Fixed deposit</option>
            <option value="PERCENTAGE">Percentage deposit</option>
          </select>
        </Field>

        <Field label="Min seller rating" htmlFor="search-rating">
          <select
            id="search-rating"
            name="ratingMin"
            defaultValue={initial.ratingMin ?? ""}
            className={selectClassName}
          >
            <option value="">Any</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="4.5">4.5+</option>
          </select>
        </Field>

        <Field label="Available from" htmlFor="search-from">
          <Input
            id="search-from"
            name="availableFrom"
            type="date"
            defaultValue={initial.availableFrom ?? ""}
            className="h-11"
          />
        </Field>

        <Field label="Available to" htmlFor="search-to">
          <Input
            id="search-to"
            name="availableTo"
            type="date"
            defaultValue={initial.availableTo ?? ""}
            className="h-11"
          />
        </Field>

        <Field label="Distance radius" htmlFor="search-radius">
          <select
            id="search-radius"
            name="radiusKm"
            defaultValue={initial.radiusKm ?? ""}
            className={selectClassName}
          >
            <option value="">Any distance</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
        </Field>

        <Field label="Sort" htmlFor="search-sort">
          <select
            id="search-sort"
            name="sort"
            defaultValue={initial.sort}
            className={selectClassName}
          >
            {SEARCH_SORT_VALUES.map((value) => (
              <option key={value} value={value}>
                {SEARCH_SORT_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="verified"
            value="1"
            defaultChecked={initial.verifiedSellerOnly}
          />
          Verified sellers
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="availableToday"
            value="1"
            defaultChecked={initial.availableToday}
          />
          Available today
        </label>
        {initial.nearLat != null && initial.nearLng != null ? (
          <span className="text-muted-foreground">
            Near you active · {initial.radiusKm ?? 25} km
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg">
          Apply filters
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={useNearMe}>
          Near me
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push("/search")}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
