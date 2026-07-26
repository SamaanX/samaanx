import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryIcon } from "@/components/marketplace/category-icon";
import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import {
  DEFAULT_SEARCH_PAGE_SIZE,
  parseMarketplaceSearchParams,
} from "@/domain/search";
import { getCategoryBySlug, searchPublicListings } from "@/features/search";
import { MarketplaceEmptyState } from "@/features/search/components/empty-state";
import { MarketplaceErrorState } from "@/features/search/components/error-state";
import { ListingGrid } from "@/features/search/components/listing-grid";
import { getCurrentProfile } from "@/lib/auth/guards";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) {
    return { title: "Category" };
  }
  return {
    title: category.name,
    description: `Browse ${category.name} rentals on SamaanX.`,
  };
}

export default async function CategoryListingsPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const rawParams = await searchParams;
  const profile = await getCurrentProfile();

  const category = await getCategoryBySlug(slug);
  if (!category) {
    notFound();
  }

  try {
    const filters = parseMarketplaceSearchParams({
      ...rawParams,
      category: slug,
      pageSize: String(DEFAULT_SEARCH_PAGE_SIZE),
    });

    const result = await searchPublicListings(filters, profile?.id ?? null);

    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <header className="space-y-3">
          <BackButton fallbackHref={BACK_FALLBACKS.categories} />
          <div className="flex items-center gap-3">
            <span className="bg-brand-blue-soft flex size-12 items-center justify-center rounded-2xl">
              <CategoryIcon name={category.icon} className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {category.name}
              </h1>
              <p className="text-muted-foreground text-sm">
                {result.total} listing{result.total === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Link
            href={`/search?category=${category.slug}`}
            className="text-muted-foreground hover:text-foreground inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            Open advanced filters
          </Link>
        </header>

        {result.items.length === 0 ? (
          <MarketplaceEmptyState
            variant="listings"
            title={`No ${category.name} listings yet`}
            description="Check back soon or browse other categories."
            actionHref="/categories"
            actionLabel="Browse categories"
          />
        ) : (
          <ListingGrid
            listings={result.items}
            isAuthenticated={Boolean(profile)}
          />
        )}
      </div>
    );
  } catch {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <MarketplaceErrorState description="This category could not be loaded." />
      </div>
    );
  }
}
