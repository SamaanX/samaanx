export type GeoapifyAddressProperties = {
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  district?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
  postcode?: string;
  lat?: number;
  lon?: number;
};

export type GeoapifyFeature = {
  type: "Feature";
  properties: GeoapifyAddressProperties;
  geometry?: {
    type: "Point";
    coordinates: [number, number];
  };
};

export type GeoapifyFeatureCollection = {
  type: "FeatureCollection";
  features: GeoapifyFeature[];
};

export type ParsedGeoAddress = {
  formattedAddress: string;
  city: string;
  area: string;
  lat: number;
  lng: number;
  countryCode: string;
};

export type GeoapifyAutocompleteSuggestion = {
  id: string;
  label: string;
  address: ParsedGeoAddress;
};
