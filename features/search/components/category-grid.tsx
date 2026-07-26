"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { CategoryIcon } from "@/components/marketplace/category-icon";
import type { CategoryBrowseItem } from "@/features/search/types/marketplace";

type CategoryGridProps = {
  categories: CategoryBrowseItem[];
};

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {categories.map((category, index) => (
        <motion.div
          key={category.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
        >
          <Link
            href={`/categories/${category.slug}`}
            className="border-border/80 bg-card hover:border-brand-blue/35 focus-visible:ring-ring flex h-full flex-col items-start gap-3 rounded-2xl border p-4 shadow-[var(--rp-shadow-xs)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--rp-shadow-sm)] focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="bg-brand-blue-soft flex size-10 items-center justify-center rounded-xl">
              <CategoryIcon name={category.icon} />
            </span>
            <span className="min-w-0">
              <span className="text-foreground block truncate text-sm font-semibold">
                {category.name}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                {category.listingCount} listing
                {category.listingCount === 1 ? "" : "s"}
              </span>
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
