/** App-level constants only — no business catalogs. */

import { BRAND } from "@/config/brand";

export const APP_NAME = BRAND.name;
export const APP_TAGLINE = BRAND.tagline;
export const APP_TAGLINE_LINES = BRAND.taglineLines;

export { BRAND };

/** Default locale for formatting helpers (Pakistan launch market). */
export const DEFAULT_LOCALE = "en-PK";

/** Default country code for multi-region-ready data model (MVP launch). */
export const DEFAULT_COUNTRY_CODE = "PK";
