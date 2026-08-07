"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  ApproximateArea,
  MapShell,
  resolveMapCenter,
  StaticMarker,
} from "@/features/maps/components/map-shell";
import type { PublicListingCardView } from "@/features/search/types/marketplace";
import type { LatLng } from "@/lib/geo/coordinates";

type ListingsBrowseMapProps = {
  listings: PublicListingCardView[];
  className?: string;
};

function fitCenter(listings: PublicListingCardView[]): LatLng {
  if (listings.length === 0) {
    return resolveMapCenter(Number.NaN, Number.NaN);
  }
  const lat =
    listings.reduce((sum, item) => sum + item.lat, 0) / listings.length;
  const lng =
    listings.reduce((sum, item) => sum + item.lng, 0) / listings.length;
  return resolveMapCenter(lat, lng);
}

export function ListingsBrowseMap({
  listings,
  className,
}: ListingsBrowseMapProps) {
  const router = useRouter();
  const mappable = listings.filter(
    (listing) => Number.isFinite(listing.lat) && Number.isFinite(listing.lng),
  );

  if (mappable.length === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-xl border border-dashed px-4 py-8 text-center text-sm">
        No map locations available for these listings.
      </p>
    );
  }

  const center = fitCenter(mappable);

  return (
    <MapShell
      center={center}
      zoom={mappable.length === 1 ? 14 : 12}
      className={className ?? "h-72 sm:h-96"}
      ariaLabel="Listings map"
      scrollWheelZoom
    >
      {mappable.map((listing) => {
        const position = { lat: listing.lat, lng: listing.lng };
        return (
          <React.Fragment key={listing.id}>
            {listing.locationPrecision === "approximate" ? (
              <ApproximateArea center={position} />
            ) : null}
            <StaticMarker
              position={position}
              title={listing.title}
              popup={
                <div className="space-y-2">
                  <p className="text-sm font-medium">{listing.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {listing.area}, {listing.city}
                  </p>
                  <Link
                    href={`/listings/${listing.slug}`}
                    className="text-brand-blue text-sm font-medium hover:underline"
                    onClick={(event) => {
                      event.preventDefault();
                      router.push(`/listings/${listing.slug}`);
                    }}
                  >
                    View listing
                  </Link>
                </div>
              }
            />
          </React.Fragment>
        );
      })}
    </MapShell>
  );
}
