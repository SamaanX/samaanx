import Link from "next/link";

import { ListingGrid } from "@/features/search/components/listing-grid";
import type { PublicListingCardView } from "@/features/search/types/marketplace";

type HomeListingSectionProps = {
  title: string;
  description?: string;
  listings: PublicListingCardView[];
  isAuthenticated: boolean;
  viewAllHref: string;
};

export function HomeListingSection({
  title,
  description,
  listings,
  isAuthenticated,
  viewAllHref,
}: HomeListingSectionProps) {
  if (listings.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          ) : null}
        </div>
        <Link
          href={viewAllHref}
          className="text-brand-blue hover:text-brand-green shrink-0 text-sm font-medium underline-offset-4 hover:underline"
        >
          View all
        </Link>
      </div>
      <ListingGrid listings={listings} isAuthenticated={isAuthenticated} />
    </section>
  );
}
