"use client";

import dynamic from "next/dynamic";
import * as React from "react";

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

/** Load Leaflet only when the map enters the viewport. */
export function LazyListingMap(props: LazyListingMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || visible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={containerRef} className="min-h-52 sm:min-h-60">
      {visible ? (
        <ListingMap {...props} />
      ) : (
        <div className="border-border text-muted-foreground flex h-52 items-center justify-center rounded-2xl border border-dashed text-sm sm:h-60">
          Loading map…
        </div>
      )}
    </div>
  );
}
