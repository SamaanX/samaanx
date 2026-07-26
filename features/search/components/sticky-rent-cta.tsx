"use client";

import { Button } from "@/components/ui/button";
import { formatRentPrice } from "@/features/search/services/format";
import type { PublicListingDetailView } from "@/features/search/types/marketplace";

type StickyRentCtaProps = {
  listing: Pick<
    PublicListingDetailView,
    "rentPriceAmount" | "rentPriceUnit" | "currency"
  >;
};

export function StickyRentCta({ listing }: StickyRentCtaProps) {
  return (
    <div className="border-border/80 bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 pb-[env(safe-area-inset-bottom)]">
        <div>
          <p className="text-muted-foreground text-xs">From</p>
          <p className="text-sm font-semibold">
            {formatRentPrice(
              listing.rentPriceAmount,
              listing.currency,
              listing.rentPriceUnit,
            )}
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          disabled
          title="Rental requests coming soon"
        >
          Rent Now
        </Button>
      </div>
    </div>
  );
}
