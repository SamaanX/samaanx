import type {
  GeoapifyAddressProperties,
  GeoapifyFeature,
  ParsedGeoAddress,
} from "@/lib/geoapify/types";

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export function parseGeoapifyFeature(
  feature: GeoapifyFeature,
): ParsedGeoAddress | null {
  const props = feature.properties;
  const geometry = feature.geometry?.coordinates;

  const lat =
    typeof props.lat === "number"
      ? props.lat
      : geometry
        ? geometry[1]
        : Number.NaN;
  const lng =
    typeof props.lon === "number"
      ? props.lon
      : geometry
        ? geometry[0]
        : Number.NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const city = firstNonEmpty(
    props.city,
    props.town,
    props.village,
    props.county,
    props.state,
  );
  const area = firstNonEmpty(
    props.suburb,
    props.district,
    props.address_line2,
    props.address_line1,
    city,
  );

  return {
    formattedAddress:
      props.formatted?.trim() ||
      [area, city, props.country].filter(Boolean).join(", "),
    city: city || area || "Unknown",
    area: area || city || "Unknown",
    lat,
    lng,
    countryCode: (props.country_code ?? "pk").toUpperCase().slice(0, 2),
  };
}

export function parseGeoapifyProperties(
  props: GeoapifyAddressProperties,
): ParsedGeoAddress | null {
  return parseGeoapifyFeature({
    type: "Feature",
    properties: props,
    geometry:
      typeof props.lon === "number" && typeof props.lat === "number"
        ? { type: "Point", coordinates: [props.lon, props.lat] }
        : undefined,
  });
}
