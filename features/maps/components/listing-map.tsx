"use client";

import Link from "next/link";

import {
  ApproximateArea,
  MapShell,
  resolveMapCenter,
  StaticMarker,
} from "@/features/maps/components/map-shell";
import type { PublicLocationPrecision } from "@/lib/geo/coordinates";
import { buildOpenStreetMapUrl } from "@/lib/geoapify/client";

type ListingMapProps = {
  lat: number;
  lng: number;
  precision: PublicLocationPrecision;
  title: string;
};

/**
 * Buyer listing map — exact marker or approximate circle on OpenStreetMap tiles.
 */
export function ListingMap({ lat, lng, precision, title }: ListingMapProps) {
  const center = resolveMapCenter(lat, lng);
  const osmUrl = buildOpenStreetMapUrl(center.lat, center.lng);

  return (
    <div className="space-y-3">
      <MapShell
        center={center}
        zoom={precision === "exact" ? 15 : 14}
        className="h-52 sm:h-60"
        ariaLabel={
          precision === "exact"
            ? "Exact pickup location"
            : "Approximate pickup area"
        }
        scrollWheelZoom={false}
      >
        {precision === "exact" ? (
          <StaticMarker
            position={center}
            title={title}
            popup={<span className="text-sm font-medium">{title}</span>}
          />
        ) : (
          <ApproximateArea center={center} />
        )}
      </MapShell>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {precision === "exact"
            ? "Exact pickup location shown by the seller."
            : "Approximate area (~400m). Exact pin is hidden for privacy."}
        </p>
        <Link
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-input bg-background hover:bg-muted inline-flex h-8 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors"
        >
          Open in OpenStreetMap
        </Link>
      </div>
    </div>
  );
}
