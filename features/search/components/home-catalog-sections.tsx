import Link from "next/link";

import {
  getCategoriesWithCounts,
  getHomeListingRails,
  getTopSellers,
} from "@/features/search";
import { CategoryGrid } from "@/features/search/components/category-grid";
import { MarketplaceEmptyState } from "@/features/search/components/empty-state";
import { HomeListingSection } from "@/features/search/components/home-listing-section";
import { RecentlyViewedRail } from "@/features/search/components/recently-viewed-rail";
import {
  CategoryGridSkeleton,
  ListingGridSkeleton,
} from "@/features/search/components/skeletons";
import { TopSellersSection } from "@/features/search/components/top-sellers-section";
import { withPerf } from "@/lib/perf";

export function HomeCategoriesFallback() {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="bg-muted h-7 w-48 animate-pulse rounded" />
          <div className="bg-muted mt-2 h-4 w-40 animate-pulse rounded" />
        </div>
      </div>
      <CategoryGridSkeleton count={12} />
    </section>
  );
}

export function HomeListingsFallback() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <div className="bg-muted h-7 w-40 animate-pulse rounded" />
        <ListingGridSkeleton count={4} />
      </section>
      <section className="space-y-4">
        <div className="bg-muted h-7 w-36 animate-pulse rounded" />
        <ListingGridSkeleton count={4} />
      </section>
    </div>
  );
}

export function HomeTopSellersFallback() {
  return (
    <section className="space-y-4">
      <div className="bg-muted h-7 w-56 animate-pulse rounded" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="border-border bg-muted/60 h-20 animate-pulse rounded-2xl border"
          />
        ))}
      </div>
    </section>
  );
}

export async function HomeCategoriesSection() {
  const categories = await withPerf("page.home.categories", () =>
    getCategoriesWithCounts(),
  );

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Browse Categories
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Explore rentals by category.
          </p>
        </div>
        <Link
          href="/categories"
          className="text-brand-blue text-sm font-medium underline-offset-4 hover:underline"
        >
          All categories
        </Link>
      </div>
      {categories.length > 0 ? (
        <CategoryGrid categories={categories.slice(0, 12)} />
      ) : (
        <MarketplaceEmptyState variant="categories" />
      )}
    </section>
  );
}

export async function HomeListingsSections({
  wishlistUserId,
  isAuthenticated,
}: {
  wishlistUserId: string | null;
  isAuthenticated: boolean;
}) {
  const { recentlyAdded, popular, highestRated } = await withPerf(
    "page.home.listings",
    () => getHomeListingRails(8, wishlistUserId),
  );

  const hasAnyListings =
    recentlyAdded.length > 0 || popular.length > 0 || highestRated.length > 0;

  if (!hasAnyListings) {
    return <MarketplaceEmptyState variant="listings" mode="BUYER" />;
  }

  return (
    <>
      <RecentlyViewedRail />
      <HomeListingSection
        title="Recently Added"
        description="Fresh listings from the community."
        listings={recentlyAdded}
        isAuthenticated={isAuthenticated}
        viewAllHref="/search?sort=newest"
      />
      <HomeListingSection
        title="Popular Listings"
        description="Most viewed and requested items."
        listings={popular}
        isAuthenticated={isAuthenticated}
        viewAllHref="/search?sort=popular"
      />
      <HomeListingSection
        title="Top Rated"
        description="Listings from highest-rated sellers."
        listings={highestRated}
        isAuthenticated={isAuthenticated}
        viewAllHref="/search?sort=highest_rated_seller"
      />
    </>
  );
}

export async function HomeTopSellersBlock() {
  const topSellers = await withPerf("page.home.topSellers", () =>
    getTopSellers(6),
  );
  return <TopSellersSection sellers={topSellers} />;
}
