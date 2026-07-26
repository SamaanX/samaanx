"use client";

import Link from "next/link";

import { BrandTagline } from "@/components/brand/brand-tagline";
import { SamaanXLogo } from "@/components/brand/samaanx-logo";
import { APP_NAME } from "@/config/constants";
import type { AppUiMode } from "@/lib/ui/app-mode";
import { usePreferredMode } from "@/providers/preferred-mode-provider";

type SiteFooterProps = {
  preferredMode?: AppUiMode;
  isAuthenticated?: boolean;
};

export function SiteFooter({
  preferredMode = "BUYER",
  isAuthenticated = false,
}: SiteFooterProps) {
  const { mode } = usePreferredMode(preferredMode);
  const year = new Date().getFullYear();
  const isSeller = isAuthenticated && mode === "SELLER";

  return (
    <footer className="border-border/70 bg-card/60 mt-auto border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <SamaanXLogo href="/" className="[&_img]:h-7" />
          <BrandTagline className="text-muted-foreground text-sm" />
          <p className="text-muted-foreground max-w-sm text-sm">
            {isSeller
              ? "Turn unused items into income — list, manage requests, and earn locally."
              : "Peer-to-peer rentals for everyday items — rent what you need nearby."}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold">
            {isSeller ? "Seller" : "Explore"}
          </p>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            {isSeller ? (
              <>
                <li>
                  <Link
                    href="/seller/listings"
                    className="hover:text-foreground"
                  >
                    My listings
                  </Link>
                </li>
                <li>
                  <Link
                    href="/seller/rentals"
                    className="hover:text-foreground"
                  >
                    Requests
                  </Link>
                </li>
                <li>
                  <Link
                    href="/seller/listings/new"
                    className="hover:text-foreground"
                  >
                    List an item
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/search" className="hover:text-foreground">
                    Browse
                  </Link>
                </li>
                <li>
                  <Link href="/categories" className="hover:text-foreground">
                    Categories
                  </Link>
                </li>
                <li>
                  <Link href="/rentals" className="hover:text-foreground">
                    My rentals
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Account</p>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            {isAuthenticated ? (
              <>
                <li>
                  <Link href="/profile" className="hover:text-foreground">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link href="/notifications" className="hover:text-foreground">
                    Notifications
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-foreground">
                    Create account
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
      <div className="border-border/60 text-muted-foreground border-t py-4 text-center text-xs">
        © {year} {APP_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
