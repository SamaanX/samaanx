import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { parseMarketplaceSearchParams } from "@/domain/search";
import {
  getCategoriesWithCounts,
  getDistinctListingCities,
  searchPublicListings,
} from "@/features/search";
import { MarketplaceEmptyState } from "@/features/search/components/empty-state";
import { MarketplaceErrorState } from "@/features/search/components/error-state";
import { SearchFilters } from "@/features/search/components/search-filters";
import { SearchResults } from "@/features/search/components/search-results";
import { SearchSuggestions } from "@/features/search/components/search-suggestions";
import { getCurrentProfile } from "@/lib/auth/guards";
import { withPerf } from "@/lib/perf";
import { JsonLd, organizationSchema, websiteSchema } from "@/lib/seo/json-ld";
import { buildSearchMetadata } from "@/lib/seo/listing-metadata";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const city = typeof params.city === "string" ? params.city : undefined;
  return buildSearchMetadata(q, city);
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const filters = parseMarketplaceSearchParams(params);
  const profile = await getCurrentProfile();

  try {
    const [categories, cities, result] = await withPerf("route.search", () =>
      Promise.all([
        getCategoriesWithCounts(),
        getDistinctListingCities(),
        searchPublicListings(filters, profile?.id ?? null),
      ]),
    );

    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <header className="space-y-2">
          <BackButton fallbackHref={BACK_FALLBACKS.marketplace} />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Marketplace Search
          </h1>
          <p className="text-muted-foreground text-sm">
            {result.total} listing{result.total === 1 ? "" : "s"} found
          </p>
        </header>

        <SearchFilters
          initial={filters}
          categories={categories}
          cities={cities}
        />

        {!filters.q && !filters.categorySlug && !filters.city ? (
          <SearchSuggestions
            categories={categories.map((c) => ({
              name: c.name,
              slug: c.slug,
            }))}
            currentQuery={filters.q || undefined}
            currentCity={filters.city || undefined}
          />
        ) : null}

        {result.items.length === 0 ? (
          <MarketplaceEmptyState
            variant="search"
            actionHref="/search"
            actionLabel="Clear filters"
          />
        ) : (
          <SearchResults
            initial={result}
            filters={filters}
            isAuthenticated={Boolean(profile)}
          />
        )}
      </div>
    );
  } catch {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <MarketplaceErrorState description="Search is temporarily unavailable." />
      </div>
    );
  }
}
