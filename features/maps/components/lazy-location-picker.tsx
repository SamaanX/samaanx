"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { Button } from "@/components/ui/button";

const LocationPicker = dynamic(
  () =>
    import("@/features/maps/components/location-picker").then(
      (m) => m.LocationPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="border-border text-muted-foreground flex h-56 items-center justify-center rounded-xl border border-dashed text-sm sm:h-64">
        Loading map…
      </div>
    ),
  },
);

type LazyLocationPickerProps = {
  lat: number;
  lng: number;
  addressHint?: string;
  initialOpen?: boolean;
  onChange: (value: {
    lat: number;
    lng: number;
    city?: string;
    area?: string;
    countryCode?: string;
    formattedAddress?: string;
  }) => void;
};

/** Gate Leaflet until seller opens the map — keeps listing form initial JS small. */
export function LazyLocationPicker({
  initialOpen = false,
  ...props
}: LazyLocationPickerProps) {
  const [open, setOpen] = React.useState(initialOpen);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        Choose location on map
      </Button>
    );
  }

  return <LocationPicker {...props} />;
}
