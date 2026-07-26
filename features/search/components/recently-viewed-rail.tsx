"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import {
  readRecentlyViewed,
  type RecentlyViewedItem,
} from "@/features/search/lib/recently-viewed";

/** Client rail for home — localStorage only, no network. */
export function RecentlyViewedRail() {
  const [items, setItems] = React.useState<RecentlyViewedItem[]>([]);

  React.useEffect(() => {
    setItems(readRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
        Recently viewed
      </h2>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {items.slice(0, 8).map((item) => (
          <li key={item.id} className="w-40 shrink-0">
            <Link
              href={`/listings/${item.slug}`}
              className="border-border/80 bg-card block overflow-hidden rounded-2xl border shadow-[var(--rp-shadow-xs)]"
            >
              <div className="bg-muted relative aspect-[4/3]">
                {item.coverImageUrl ? (
                  <Image
                    src={item.coverImageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                ) : null}
              </div>
              <div className="space-y-0.5 p-2.5">
                <p className="line-clamp-2 text-xs font-semibold">
                  {item.title}
                </p>
                <p className="text-muted-foreground truncate text-[0.7rem]">
                  {item.area}, {item.city}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
