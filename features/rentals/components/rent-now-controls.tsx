"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { AvailabilityHints } from "@/domain/rental";
import { RentalRequestDialog } from "@/features/rentals/components/rental-request-dialog";
import { formatRentPrice } from "@/features/search/services/format";
import type { PublicListingDetailView } from "@/features/search/types/marketplace";

type DateHints = AvailabilityHints;

type RentNowControlsProps = {
  listing: PublicListingDetailView;
  hints: DateHints;
  isAuthenticated: boolean;
  isOwner: boolean;
};

export function RentNowControls({
  listing,
  hints,
  isAuthenticated,
  isOwner,
}: RentNowControlsProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  function onRentClick() {
    if (!isAuthenticated) {
      router.push(
        `/login?next=${encodeURIComponent(`/listings/${listing.slug}`)}`,
      );
      return;
    }
    if (isOwner) {
      return;
    }
    setOpen(true);
  }

  const disabled = isOwner;
  const title = isOwner
    ? "You cannot rent your own listing"
    : "Request to rent this item";

  return (
    <>
      <div className="hidden lg:block">
        <Button
          type="button"
          size="lg"
          className="mt-5 w-full"
          disabled={disabled}
          title={title}
          onClick={onRentClick}
        >
          Rent Now
        </Button>
        <p className="text-muted-foreground mt-2 text-center text-xs">
          {isOwner
            ? "This is your listing."
            : "No payment yet — submit a request to the seller."}
        </p>
      </div>

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
            disabled={disabled}
            title={title}
            onClick={onRentClick}
          >
            Rent Now
          </Button>
        </div>
      </div>

      <RentalRequestDialog
        open={open}
        onClose={() => setOpen(false)}
        listing={listing}
        hints={hints}
      />
    </>
  );
}
