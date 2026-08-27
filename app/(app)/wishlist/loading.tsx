import { ListingGridSkeleton } from "@/features/search/components/skeletons";

export default function WishlistLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="bg-muted mb-6 h-8 w-36 animate-pulse rounded-xl" />
      <ListingGridSkeleton count={6} />
    </div>
  );
}
