import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { getCategoriesWithCounts } from "@/features/search";
import { CategoryGrid } from "@/features/search/components/category-grid";
import { MarketplaceEmptyState } from "@/features/search/components/empty-state";
import { MarketplaceErrorState } from "@/features/search/components/error-state";

export const metadata = {
  title: "Categories",
  description: "Browse all SamaanX rental categories.",
};

export default async function CategoriesPage() {
  try {
    const categories = await getCategoriesWithCounts();

    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <header className="space-y-2">
          <BackButton fallbackHref={BACK_FALLBACKS.marketplace} />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            All Categories
          </h1>
          <p className="text-muted-foreground text-sm">
            Find rentals by category across the marketplace.
          </p>
        </header>

        {categories.length === 0 ? (
          <MarketplaceEmptyState variant="categories" />
        ) : (
          <CategoryGrid categories={categories} />
        )}
      </div>
    );
  } catch {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <MarketplaceErrorState description="Categories could not be loaded." />
      </div>
    );
  }
}
