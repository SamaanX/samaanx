import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";

export type SitemapEntry = {
  slug: string;
  updatedAt: Date;
};

export const getSitemapListings = unstable_cache(
  async (): Promise<SitemapEntry[]> => {
    return prisma.listing.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        moderationStatus: "APPROVED",
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
  },
  ["sitemap-listings"],
  { revalidate: 3600 },
);

export const getSitemapCategories = unstable_cache(
  async (): Promise<SitemapEntry[]> => {
    return prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { sortOrder: "asc" },
    });
  },
  ["sitemap-categories"],
  { revalidate: 3600 },
);
