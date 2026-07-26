/** Minimal Google Maps typings for lazy-loaded Maps JS API. */
declare namespace google.maps {
  class Map {
    constructor(el: HTMLElement, opts?: Record<string, unknown>);
    addListener(event: string, handler: (e: MapMouseEvent) => void): void;
  }
  class Marker {
    constructor(opts?: Record<string, unknown>);
    setPosition(pos: LatLngLiteral | LatLng): void;
    getPosition(): LatLng | null | undefined;
    setMap(map: Map | null): void;
    addListener(event: string, handler: () => void): void;
  }
  class Circle {
    constructor(opts?: Record<string, unknown>);
  }
  class LatLng {
    lat(): number;
    lng(): number;
  }
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  interface MapMouseEvent {
    latLng?: LatLng | null;
  }
}

declare const google: {
  maps: typeof google.maps;
};
