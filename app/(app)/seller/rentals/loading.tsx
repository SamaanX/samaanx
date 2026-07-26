import { RentalListSkeleton } from "@/features/rentals/components/rental-skeletons";

export default function SellerRentalsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8 sm:px-6">
      <div className="bg-muted h-8 w-48 animate-pulse rounded-xl" />
      <div className="bg-muted h-10 w-full animate-pulse rounded-full" />
      <RentalListSkeleton count={3} />
    </div>
  );
}
