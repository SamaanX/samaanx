"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { PublicLocationPrecision } from "@/lib/geo/coordinates";

const ListingMap = dynamic(
  () =>
    import("@/features/maps/components/listing-map").then((m) => m.ListingMap),
  {
    ssr: false,
    loading: () => (
      <div className="border-border text-muted-foreground flex h-52 items-center justify-center rounded-2xl border border-dashed text-sm">
        Loading map…
      </div>
    ),
  },
);

type LazyListingMapProps = {
  apiKey: string;
  lat: number;
  lng: number;
  precision: PublicLocationPrecision;
  title: string;
};

/** Gate Maps JS until buyer opens the map. */
export function LazyListingMap(props: LazyListingMapProps) {
  const [open, setOpen] = React.useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        View on map
      </Button>
    );
  }

  return <ListingMap {...props} />;
}
