type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** Server-safe JSON-LD injection for structured data. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationSchema() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SamaanX",
    url: base,
    logo: `${base}/icons/icon-512.png`,
    sameAs: [],
  };
}

export function websiteSchema() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SamaanX",
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; href: string }>) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href.startsWith("http") ? item.href : `${base}${item.href}`,
    })),
  };
}

export function listingProductSchema(input: {
  title: string;
  description: string;
  slug: string;
  imageUrl?: string | null;
  city: string;
  price: number;
  currency: string;
  priceUnit: string;
  sellerName: string;
  rating?: number;
  ratingCount?: number;
}) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${base}/listings/${input.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    description: input.description.slice(0, 500),
    image: input.imageUrl ? [input.imageUrl] : undefined,
    brand: { "@type": "Brand", name: "SamaanX" },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: input.currency,
      price: input.price,
      availability: "https://schema.org/InStock",
      description: `Rent per ${input.priceUnit.toLowerCase()} in ${input.city}`,
    },
    ...(input.ratingCount && input.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: input.rating,
            reviewCount: input.ratingCount,
          },
        }
      : {}),
    seller: {
      "@type": "Person",
      name: input.sellerName,
    },
  };
}

export function faqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function reviewSchema(input: {
  itemName: string;
  ratingValue: number;
  reviewCount: number;
  url: string;
}) {
  if (input.reviewCount <= 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.itemName,
    url: input.url,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: input.ratingValue,
      reviewCount: input.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
  };
}
