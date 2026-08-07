"use client";

import "leaflet/dist/leaflet.css";

import type { LatLngExpression, Marker as LeafletMarker } from "leaflet";
import * as React from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import {
  APPROXIMATE_RADIUS_METERS,
  DEFAULT_MAP_CENTER,
  OSM_TILE_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/features/maps/constants";
import { ensureLeafletIcons } from "@/features/maps/lib/leaflet-setup";
import type { LatLng } from "@/lib/geo/coordinates";
import { cn } from "@/lib/utils";

type MapShellProps = {
  center: LatLng;
  zoom?: number;
  className?: string;
  ariaLabel: string;
  children?: React.ReactNode;
  scrollWheelZoom?: boolean;
};

export function MapShell({
  center,
  zoom = 14,
  className,
  ariaLabel,
  children,
  scrollWheelZoom = true,
}: MapShellProps) {
  React.useEffect(() => {
    ensureLeafletIcons();
  }, []);

  const position: LatLngExpression = [center.lat, center.lng];

  return (
    <div
      className={cn(
        "border-border bg-muted overflow-hidden rounded-xl border",
        className,
      )}
      aria-label={ariaLabel}
    >
      <MapContainer
        center={position}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full"
        style={{ minHeight: "inherit" }}
      >
        <TileLayer url={OSM_TILE_URL} attribution={OSM_TILE_ATTRIBUTION} />
        <RecenterMap center={center} />
        {children}
      </MapContainer>
    </div>
  );
}

function RecenterMap({ center }: { center: LatLng }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center.lat, center.lng, map]);
  return null;
}

type DraggableMarkerProps = {
  position: LatLng;
  onChange: (coords: LatLng) => void;
};

export function DraggableMarker({ position, onChange }: DraggableMarkerProps) {
  const markerRef = React.useRef<LeafletMarker | null>(null);

  return (
    <Marker
      draggable
      position={[position.lat, position.lng]}
      ref={markerRef}
      eventHandlers={{
        dragend: () => {
          const marker = markerRef.current;
          if (!marker) return;
          const latLng = marker.getLatLng();
          onChange({ lat: latLng.lat, lng: latLng.lng });
        },
      }}
    />
  );
}

type MapClickHandlerProps = {
  onClick: (coords: LatLng) => void;
};

export function MapClickHandler({ onClick }: MapClickHandlerProps) {
  useMapEvents({
    click(event) {
      onClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

type StaticMarkerProps = {
  position: LatLng;
  title?: string;
  popup?: React.ReactNode;
};

export function StaticMarker({ position, title, popup }: StaticMarkerProps) {
  return (
    <Marker position={[position.lat, position.lng]} title={title}>
      {popup ? <Popup>{popup}</Popup> : null}
    </Marker>
  );
}

type ApproximateAreaProps = {
  center: LatLng;
  radiusMeters?: number;
};

export function ApproximateArea({
  center,
  radiusMeters = APPROXIMATE_RADIUS_METERS,
}: ApproximateAreaProps) {
  return (
    <Circle
      center={[center.lat, center.lng]}
      radius={radiusMeters}
      pathOptions={{
        color: "#0B6E4F",
        fillColor: "#0B6E4F",
        fillOpacity: 0.18,
        weight: 2,
        opacity: 0.55,
      }}
    />
  );
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export function resolveMapCenter(lat: number, lng: number): LatLng {
  return isValidCoordinate(lat, lng) ? { lat, lng } : DEFAULT_MAP_CENTER;
}
