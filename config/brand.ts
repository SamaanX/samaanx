/**
 * SamaanX brand — extracted from official logo PNG.
 * Primary blue #1048A8 · Secondary teal/green #00B880
 */

export const BRAND = {
  name: "SamaanX",
  /** Single-line for metadata / SEO */
  tagline: "Apki Cheez. Apki Income.",
  /** Display lines for UI */
  taglineLines: ["Apki Cheez.", "Apki Income."] as const,
  colors: {
    blue: "#1048A8",
    green: "#00B880",
    white: "#FFFFFF",
    black: "#000000",
  },
  assets: {
    logo: "/brand/samaanx-logo.png",
    logoStacked: "/brand/samaanx-logo-stacked.png",
    mark: "/brand/samaanx-mark.png",
    source: "/brand/samaanx-source.png",
  },
} as const;
