"use client";

import dynamic from "next/dynamic";

const ListingsBrowseMap = dynamic(
  () =>
    import("@/features/maps/components/listings-browse-map").then(
      (m) => m.ListingsBrowseMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="border-border text-muted-foreground flex h-72 items-center justify-center rounded-xl border border-dashed text-sm sm:h-96">
        Loading map…
      </div>
    ),
  },
);

export { ListingsBrowseMap };
