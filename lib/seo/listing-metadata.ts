import type { Metadata } from "next";

import { absoluteUrl, defaultOpenGraphImage } from "@/lib/seo/canonical";

type ListingMetaInput = {
  title: string;
  description: string;
  slug: string;
  city: string;
  categoryName: string;
  rentPriceLabel: string;
  imageUrl?: string | null;
  imageAlt?: string;
  noIndex?: boolean;
};

export function buildListingMetadata(input: ListingMetaInput): Metadata {
  const canonical = absoluteUrl(`/listings/${input.slug}`);
  const pageTitle = `${input.title} · Rent in ${input.city}`;
  const pageDescription =
    `Rent ${input.title} in ${input.city} from ${input.rentPriceLabel}. ` +
    `${input.categoryName}. ${input.description.slice(0, 120)}`.slice(0, 160);

  const ogImage = input.imageUrl
    ? {
        url: input.imageUrl,
        width: 1200,
        height: 630,
        alt: input.imageAlt ?? input.title,
      }
    : defaultOpenGraphImage();

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: [
      input.title,
      input.categoryName,
      input.city,
      "rent",
      "rental",
      "SamaanX",
      "Pakistan",
    ],
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: pageTitle,
      description: pageDescription,
      images: [ogImage],
      locale: "en_PK",
      siteName: "SamaanX",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [input.imageUrl ?? absoluteUrl("/icons/icon-512.png")],
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export function buildSearchMetadata(query?: string, city?: string): Metadata {
  const title = query
    ? `Search: ${query}${city ? ` in ${city}` : ""}`
    : city
      ? `Rentals in ${city}`
      : "Search rentals";
  const description = query
    ? `Find ${query} to rent near you on SamaanX.`
    : "Search cameras, tools, bikes and more to rent nearby.";
  const path = query
    ? `/search?q=${encodeURIComponent(query)}${city ? `&city=${encodeURIComponent(city)}` : ""}`
    : "/search";

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
    },
    twitter: { card: "summary", title, description },
  };
}
