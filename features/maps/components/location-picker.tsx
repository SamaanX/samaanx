"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/features/maps/components/address-autocomplete";
import {
  DraggableMarker,
  MapClickHandler,
  MapShell,
  resolveMapCenter,
} from "@/features/maps/components/map-shell";
import type { LatLng } from "@/lib/geo/coordinates";
import { reverseGeocode } from "@/lib/geoapify/client";
import type { ParsedGeoAddress } from "@/lib/geoapify/types";

export type LocationPickerValue = {
  lat: number;
  lng: number;
  city?: string;
  area?: string;
  countryCode?: string;
  formattedAddress?: string;
};

type LocationPickerProps = {
  lat: number;
  lng: number;
  addressHint?: string;
  onChange: (value: LocationPickerValue) => void;
};

/**
 * Seller map picker — OpenStreetMap tiles + Geoapify geocoding.
 */
export function LocationPicker({
  lat,
  lng,
  addressHint = "",
  onChange,
}: LocationPickerProps) {
  const [position, setPosition] = React.useState<LatLng>(() =>
    resolveMapCenter(lat, lng),
  );
  const [searchLabel, setSearchLabel] = React.useState(addressHint);
  const [error, setError] = React.useState<string | null>(null);
  const [reverseBusy, setReverseBusy] = React.useState(false);
  const reverseAbortRef = React.useRef<AbortController | null>(null);
  const reverseDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  React.useEffect(() => {
    setPosition(resolveMapCenter(lat, lng));
  }, [lat, lng]);

  React.useEffect(() => {
    setSearchLabel(addressHint);
  }, [addressHint]);

  React.useEffect(() => {
    return () => {
      reverseAbortRef.current?.abort();
      if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current);
    };
  }, []);

  function applyAddress(address: ParsedGeoAddress) {
    const next = { lat: address.lat, lng: address.lng };
    setPosition(next);
    setSearchLabel(address.formattedAddress);
    onChange({
      ...next,
      city: address.city,
      area: address.area,
      countryCode: address.countryCode,
      formattedAddress: address.formattedAddress,
    });
  }

  function scheduleReverseGeocode(next: LatLng) {
    if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current);
    reverseDebounceRef.current = setTimeout(() => {
      reverseAbortRef.current?.abort();
      const controller = new AbortController();
      reverseAbortRef.current = controller;
      setReverseBusy(true);
      void reverseGeocode(next.lat, next.lng, { signal: controller.signal })
        .then((address) => {
          if (!address || controller.signal.aborted) return;
          setSearchLabel(address.formattedAddress);
          onChange({
            lat: next.lat,
            lng: next.lng,
            city: address.city,
            area: address.area,
            countryCode: address.countryCode,
            formattedAddress: address.formattedAddress,
          });
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            onChange({ lat: next.lat, lng: next.lng });
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setReverseBusy(false);
        });
    }, 350);
  }

  function updatePosition(next: LatLng) {
    setPosition(next);
    setError(null);
    scheduleReverseGeocode(next);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updatePosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => setError("Location permission denied."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-3">
      <AddressAutocomplete
        value={searchLabel}
        onSelect={applyAddress}
        disabled={reverseBusy}
      />

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

      <MapShell
        center={position}
        zoom={14}
        className="h-56 sm:h-64"
        ariaLabel="Map to choose pickup location"
        scrollWheelZoom
      >
        <DraggableMarker position={position} onChange={updatePosition} />
        <MapClickHandler onClick={updatePosition} />
      </MapShell>

      {reverseBusy ? (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Updating address…
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Tap the map, drag the pin, or search above. Coordinates are stored
          securely.
        </p>
      )}

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
