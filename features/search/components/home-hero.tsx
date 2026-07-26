"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { BrandTagline } from "@/components/brand/brand-tagline";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addRecentSearch,
  TRENDING_SEARCHES,
} from "@/features/search/lib/recent-searches";
import { trackEvent } from "@/lib/analytics/events";
import type { AppUiMode } from "@/lib/ui/app-mode";
import { cn } from "@/lib/utils";

type HomeHeroProps = {
  mode?: AppUiMode;
  isAuthenticated?: boolean;
};

export function HomeHero({
  mode = "BUYER",
  isAuthenticated = false,
}: HomeHeroProps) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const isSeller = isAuthenticated && mode === "SELLER";

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const query = q.trim();
    if (query) {
      addRecentSearch(query);
      trackEvent("search", { source: "home", q: query });
    }
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  if (isSeller) {
    return null;
  }

  return (
    <section className="border-border/70 bg-card relative overflow-hidden rounded-3xl border px-5 py-10 shadow-[var(--rp-shadow-md)] sm:px-10 sm:py-14">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-brand-blue/15 absolute -top-16 left-1/4 h-56 w-56 rounded-full blur-3xl" />
        <div className="bg-brand-green/15 absolute right-0 bottom-0 h-48 w-48 rounded-full blur-3xl" />
      </div>

      <motion.div
        key="buyer-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative mx-auto max-w-2xl text-center"
      >
        <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          Rent Anything.
        </h1>
        <BrandTagline
          multiline
          className="text-muted-foreground mt-4 text-base font-medium sm:text-lg"
        />
        <p className="text-muted-foreground mt-3 text-sm">
          Find gear near you — cameras, tools, bikes, and more.
        </p>

        <form
          onSubmit={onSearch}
          className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-2 sm:flex-row"
          role="search"
        >
          <label htmlFor="home-search" className="sr-only">
            Search listings
          </label>
          <div className="relative flex-1">
            <Search
              className="text-brand-blue pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="home-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="What do you need to rent?"
              className="h-12 rounded-xl pl-10"
            />
          </div>
          <button
            type="submit"
            className={cn(buttonVariants({ size: "lg" }), "sm:px-8")}
          >
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {TRENDING_SEARCHES.slice(0, 4).map((term) => (
            <Link
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              onClick={() =>
                trackEvent("search", { source: "trending", q: term })
              }
              className="border-border/60 bg-background/80 text-muted-foreground hover:border-brand-blue/40 hover:text-foreground rounded-full border px-3 py-1 text-xs font-medium"
            >
              {term}
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <Link
            href="/search"
            className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
          >
            Browse Items
          </Link>
          <Link
            href="/categories"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full sm:w-auto",
            )}
          >
            Browse Categories
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
