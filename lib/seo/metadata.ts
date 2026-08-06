import type { Metadata } from "next";

import { APP_NAME, APP_TAGLINE } from "@/config/constants";
import { absoluteUrl, defaultOpenGraphImage } from "@/lib/seo/canonical";

export const defaultMetadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  keywords: ["rental", "marketplace", "peer-to-peer", "SamaanX"],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: absoluteUrl("/"),
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_TAGLINE,
    images: [defaultOpenGraphImage()],
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_TAGLINE,
    images: [absoluteUrl("/icons/icon-512.png")],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: absoluteUrl("/"),
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
        },
      }
    : {}),
};
