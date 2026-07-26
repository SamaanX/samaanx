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
      <div className="border-border text-muted-foreground flex h-56 items-center justify-center rounded-xl border border-dashed text-sm">
        Loading map…
      </div>
    ),
  },
);

type LazyLocationPickerProps = {
  apiKey: string;
  lat: number;
  lng: number;
  onChange: (coords: { lat: number; lng: number }) => void;
};

/** Gate Maps JS until seller clicks — keeps listing form initial JS small. */
export function LazyLocationPicker(props: LazyLocationPickerProps) {
  const [open, setOpen] = React.useState(false);

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
