import { ListingCard } from "@/features/search/components/listing-card";
import type { PublicListingCardView } from "@/features/search/types/marketplace";

type ListingGridProps = {
  listings: PublicListingCardView[];
  isAuthenticated: boolean;
};

export function ListingGrid({ listings, isAuthenticated }: ListingGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((listing, index) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isAuthenticated={isAuthenticated}
          priority={index < 2}
        />
      ))}
    </div>
  );
}
