"use client";

import dynamic from "next/dynamic";

import type { PublicLocationPrecision } from "@/lib/geo/coordinates";

const ListingMap = dynamic(
  () =>
    import("@/features/maps/components/listing-map").then((m) => m.ListingMap),
  {
    ssr: false,
    loading: () => (
      <div className="border-border text-muted-foreground flex h-52 items-center justify-center rounded-2xl border border-dashed text-sm sm:h-60">
        Loading map…
      </div>
    ),
  },
);

type LazyListingMapProps = {
  lat: number;
  lng: number;
  precision: PublicLocationPrecision;
  title: string;
};

/** Lazy-load Leaflet for listing detail pages. */
export function LazyListingMap(props: LazyListingMapProps) {
  return <ListingMap {...props} />;
}
