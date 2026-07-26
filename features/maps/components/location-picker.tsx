"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { loadGoogleMaps } from "@/lib/maps/load-google-maps";

type LocationPickerProps = {
  apiKey: string;
  lat: number;
  lng: number;
  onChange: (coords: { lat: number; lng: number }) => void;
};

/**
 * Seller map picker — loaded only when this component mounts (dynamic import parent).
 */
export function LocationPicker({
  apiKey,
  lat,
  lng,
  onChange,
}: LocationPickerProps) {
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const markerRef = React.useRef<google.maps.Marker | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let map: google.maps.Map | null = null;

    void (async () => {
      try {
        if (!apiKey) {
          setError("Google Maps API key is not configured.");
          return;
        }
        const g = await loadGoogleMaps(apiKey);
        if (cancelled || !mapRef.current) return;

        map = new g.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            {
              featureType: "water",
              stylers: [{ color: "#d6eaf8" }],
            },
          ],
        });

        markerRef.current = new g.maps.Marker({
          map,
          position: { lat, lng },
          draggable: true,
        });

        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          const position = event.latLng;
          if (!position) return;
          const next = { lat: position.lat(), lng: position.lng() };
          markerRef.current?.setPosition(next);
          onChange(next);
        });

        markerRef.current.addListener("dragend", () => {
          const position = markerRef.current?.getPosition();
          if (!position) return;
          onChange({ lat: position.lat(), lng: position.lng() });
        });

        setReady(true);
      } catch {
        setError(
          "Could not load map. You can still enter coordinates manually.",
        );
      }
    })();

    return () => {
      cancelled = true;
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
    // Mount once — parent updates lat/lng via controlled inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        onChange(next);
        markerRef.current?.setPosition(next);
        setError(null);
      },
      () => setError("Location permission denied."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Pickup location on map</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={useMyLocation}
        >
          Use my location
        </Button>
      </div>
      <div
        ref={mapRef}
        className="border-border bg-muted h-56 w-full overflow-hidden rounded-xl border"
        aria-label="Map to choose pickup location"
      />
      {!ready && !error ? (
        <p className="text-muted-foreground text-xs">Loading map…</p>
      ) : null}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Tap the map or drag the pin. Exact coordinates are stored securely.
        </p>
      )}
    </div>
  );
}
