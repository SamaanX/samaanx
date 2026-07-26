import { ListingGridSkeleton } from "@/features/search/components/skeletons";

export default function MarketplaceLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="bg-muted h-10 w-48 animate-pulse rounded-xl" />
      <div className="bg-muted h-40 animate-pulse rounded-2xl" />
      <ListingGridSkeleton count={8} />
    </div>
  );
}
