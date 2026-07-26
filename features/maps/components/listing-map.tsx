"use client";

import * as React from "react";

import type { PublicLocationPrecision } from "@/lib/geo/coordinates";
import { loadGoogleMaps } from "@/lib/maps/load-google-maps";

type ListingMapProps = {
  apiKey: string;
  lat: number;
  lng: number;
  precision: PublicLocationPrecision;
  title: string;
};

/**
 * Buyer map — exact marker or approximate circle. Lazy-loaded by parent.
 */
export function ListingMap({
  apiKey,
  lat,
  lng,
  precision,
  title,
}: ListingMapProps) {
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (!apiKey) {
          setError("Map unavailable.");
          return;
        }
        const g = await loadGoogleMaps(apiKey);
        if (cancelled || !mapRef.current) return;

        const center = { lat, lng };
        const map = new g.maps.Map(mapRef.current, {
          center,
          zoom: precision === "exact" ? 15 : 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "water", stylers: [{ color: "#d6eaf8" }] },
          ],
        });

        if (precision === "exact") {
          new g.maps.Marker({
            map,
            position: center,
            title,
          });
        } else {
          new g.maps.Circle({
            map,
            center,
            radius: 400,
            fillColor: "#0B6E4F",
            fillOpacity: 0.18,
            strokeColor: "#0B6E4F",
            strokeOpacity: 0.55,
            strokeWeight: 2,
          });
        }
      } catch {
        setError("Could not load map.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey, lat, lng, precision, title]);

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="border-border bg-muted h-52 w-full overflow-hidden rounded-2xl border"
        aria-label={
          precision === "exact"
            ? "Exact pickup location"
            : "Approximate pickup area"
        }
      />
      <p className="text-muted-foreground text-xs">
        {precision === "exact"
          ? "Exact pickup location shown by the seller."
          : "Approximate area (~400m). Exact pin is hidden for privacy."}
      </p>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
