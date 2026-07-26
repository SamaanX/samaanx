import { ClipboardList, PackagePlus, Store } from "lucide-react";
import Link from "next/link";

import { BrandTagline } from "@/components/brand/brand-tagline";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    href: "/seller/listings/new",
    title: "List an item",
    body: "Add photos, price, and availability in a few steps.",
    icon: PackagePlus,
    primary: true,
  },
  {
    href: "/seller/listings",
    title: "My listings",
    body: "Edit, pause, or review everything you’re renting out.",
    icon: Store,
    primary: false,
  },
  {
    href: "/seller/rentals",
    title: "Rental requests",
    body: "Approve, reject, and track incoming buyer requests.",
    icon: ClipboardList,
    primary: false,
  },
] as const;

/** Home experience when preferredMode is SELLER. */
export function SellerHome() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
      <section className="border-brand-green/25 bg-card relative overflow-hidden rounded-3xl border px-5 py-10 shadow-[var(--rp-shadow-md)] sm:px-10 sm:py-12">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="bg-brand-green/15 absolute -top-16 right-1/4 h-56 w-56 rounded-full blur-3xl" />
          <div className="bg-brand-blue/10 absolute bottom-0 left-0 h-48 w-48 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-2xl">
          <p className="text-brand-green text-sm font-semibold tracking-wide">
            Seller mode
          </p>
          <h1 className="text-foreground mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Earn From Everything.
          </h1>
          <BrandTagline
            multiline
            className="text-muted-foreground mt-3 text-base font-medium"
          />
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed sm:text-base">
            Manage your listings and respond to rental requests. Switch to Buyer
            anytime to browse the marketplace.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/seller/listings/new"
              className={cn(buttonVariants({ size: "lg" }), "sm:w-auto")}
            >
              List an item
            </Link>
            <Link
              href="/seller/rentals"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "sm:w-auto",
              )}
            >
              View requests
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              "bg-card hover:border-brand-green/35 hover:bg-brand-green-soft/30 focus-visible:ring-ring rounded-2xl border p-5 shadow-[var(--rp-shadow-xs)] transition-colors focus-visible:ring-2 focus-visible:outline-none",
              action.primary ? "border-brand-green/30" : "border-border/80",
            )}
          >
            <action.icon className="text-brand-green size-6" aria-hidden />
            <h2 className="mt-3 text-base font-semibold tracking-tight">
              {action.title}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {action.body}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
