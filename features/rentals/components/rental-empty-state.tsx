import { PackageOpen } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RentalEmptyStateProps = {
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function RentalEmptyState({
  title = "No rentals here",
  description = "When you send or receive requests, they will show up in this tab.",
  actionHref = "/search",
  actionLabel = "Browse listings",
}: RentalEmptyStateProps) {
  return (
    <div className="border-border bg-card flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center shadow-[var(--rp-shadow-xs)]">
      <div className="bg-brand-blue-soft mb-4 flex size-14 items-center justify-center rounded-2xl">
        <PackageOpen className="text-brand-blue size-7" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </p>
      <Link
        href={actionHref}
        className={cn(buttonVariants({ size: "lg" }), "mt-6")}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
