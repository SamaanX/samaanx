import { BadgeCheck, ShieldCheck, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

import { BrandTagline } from "@/components/brand/brand-tagline";
import { buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/config/constants";
import type { AppUiMode } from "@/lib/ui/app-mode";
import { cn } from "@/lib/utils";

const BUYER_REASONS = [
  {
    icon: ShieldCheck,
    title: "Trusted peers",
    body: "Seller ratings and verification badges help you rent with confidence.",
  },
  {
    icon: Zap,
    title: "Fast discovery",
    body: "Search by keyword, category, city, price, and availability in seconds.",
  },
  {
    icon: BadgeCheck,
    title: "Built for Pakistan",
    body: "Cities, areas, and PKR pricing — designed for local rentals.",
  },
] as const;

const SELLER_REASONS = [
  {
    icon: Sparkles,
    title: "Earn from idle items",
    body: "List what you already own and turn unused gear into income.",
  },
  {
    icon: ShieldCheck,
    title: "Secure handovers",
    body: "QR & PIN verification keeps rentals clear for you and buyers.",
  },
  {
    icon: BadgeCheck,
    title: "Built for Pakistan",
    body: "Local cities, areas, and PKR pricing for everyday rentals.",
  },
] as const;

type ModeAwareProps = {
  mode?: AppUiMode;
  isAuthenticated?: boolean;
};

export function WhyChooseSection({
  mode = "BUYER",
  isAuthenticated = false,
}: ModeAwareProps) {
  const isSeller = isAuthenticated && mode === "SELLER";
  const reasons = isSeller ? SELLER_REASONS : BUYER_REASONS;

  return (
    <section className="space-y-6">
      <div className="max-w-xl">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {isSeller ? `Why sell on ${APP_NAME}` : `Why Choose ${APP_NAME}`}
        </h2>
        <BrandTagline className="text-muted-foreground mt-1 text-sm font-medium" />
        <p className="text-muted-foreground mt-2 text-sm">
          {isSeller
            ? "Simple listing tools and clear rental requests — built for local earners."
            : "A premium peer-to-peer rental marketplace — simple, trustworthy, and local."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reasons.map((reason) => (
          <div
            key={reason.title}
            className="border-border/80 bg-card rounded-2xl border p-5 shadow-[var(--rp-shadow-xs)]"
          >
            <reason.icon className="text-brand-blue size-6" aria-hidden />
            <h3 className="mt-3 text-sm font-semibold">{reason.title}</h3>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {reason.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeCtaSection({
  mode = "BUYER",
  isAuthenticated = false,
}: ModeAwareProps) {
  const isSeller = isAuthenticated && mode === "SELLER";

  if (isSeller) {
    return (
      <section className="border-border/80 bg-brand-gradient rounded-3xl border px-6 py-10 text-center text-white shadow-[var(--rp-shadow-md)] sm:px-10">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Ready to earn more?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-white/90">
          List another item or catch up on pending requests.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <Link
            href="/seller/listings/new"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "text-brand-blue border-transparent bg-white hover:bg-white/95",
            )}
          >
            List an item
          </Link>
          <Link
            href="/seller/rentals"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-white/50 bg-transparent text-white hover:bg-white/10",
            )}
          >
            View requests
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="border-border/80 bg-brand-gradient rounded-3xl border px-6 py-10 text-center text-white shadow-[var(--rp-shadow-md)] sm:px-10">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Ready to rent?
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-white/90">
        Browse nearby gear and request what you need in minutes.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
        <Link
          href="/search"
          className={cn(
            buttonVariants({ variant: "secondary", size: "lg" }),
            "text-brand-blue border-transparent bg-white hover:bg-white/95",
          )}
        >
          Browse Items
        </Link>
        <Link
          href="/categories"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "border-white/50 bg-transparent text-white hover:bg-white/10",
          )}
        >
          Browse Categories
        </Link>
      </div>
    </section>
  );
}
