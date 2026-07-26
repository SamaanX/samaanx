import { FolderOpen, PackageOpen, SearchX } from "lucide-react";
import Link from "next/link";

import { BrandTagline } from "@/components/brand/brand-tagline";
import { buttonVariants } from "@/components/ui/button";
import type { AppUiMode } from "@/lib/ui/app-mode";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  variant: "listings" | "search" | "categories";
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  mode?: AppUiMode;
};

const COPY = {
  listings: {
    icon: PackageOpen,
    title: "No listings yet",
    description: "Check back soon for new rentals nearby.",
    actionHref: "/search",
    actionLabel: "Browse search",
  },
  search: {
    icon: SearchX,
    title: "No results found",
    description: "Try different keywords, city, or filters.",
    actionHref: "/search",
    actionLabel: "Clear filters",
  },
  categories: {
    icon: FolderOpen,
    title: "No categories",
    description: "Categories will appear once the catalog is ready.",
    actionHref: "/",
    actionLabel: "Back home",
  },
} as const;

export function MarketplaceEmptyState({
  variant,
  title,
  description,
  actionHref,
  actionLabel,
  mode = "BUYER",
}: EmptyStateProps) {
  const defaults = COPY[variant];
  const Icon = defaults.icon;

  const resolvedHref =
    actionHref ??
    (variant === "listings" && mode === "SELLER"
      ? "/seller/listings/new"
      : defaults.actionHref);
  const resolvedLabel =
    actionLabel ??
    (variant === "listings" && mode === "SELLER"
      ? "List an item"
      : defaults.actionLabel);
  const resolvedDescription =
    description ??
    (variant === "listings" && mode === "SELLER"
      ? "Be the first to list an item and start earning."
      : defaults.description);

  return (
    <div className="border-border bg-card flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center shadow-[var(--rp-shadow-xs)]">
      <div className="bg-brand-blue-soft mb-4 flex size-14 items-center justify-center rounded-2xl">
        <Icon className="text-brand-blue size-7" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">
        {title ?? defaults.title}
      </h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {resolvedDescription}
      </p>
      {variant === "listings" ? (
        <BrandTagline className="text-muted-foreground/80 mt-3 text-xs font-medium" />
      ) : null}
      <Link
        href={resolvedHref}
        className={cn(buttonVariants({ size: "lg" }), "mt-6")}
      >
        {resolvedLabel}
      </Link>
    </div>
  );
}
