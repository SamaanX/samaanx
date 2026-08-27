"use client";

import { Heart, Home, Package, Search, Store, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { useChatUnreadTotal } from "@/features/chat/hooks/use-chat-unread-total";
import type { AppUiMode } from "@/lib/ui/app-mode";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  isAuthenticated: boolean;
  mode: AppUiMode;
};

type TabItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match: (pathname: string) => boolean;
  badge?: number;
};

function shouldHideBottomNav(pathname: string): boolean {
  if (pathname.startsWith("/chat")) return true;
  if (/^\/listings\/[^/]+$/.test(pathname)) return true;
  if (pathname.includes("/handover") || pathname.includes("/return"))
    return true;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/admin")
  ) {
    return true;
  }
  return false;
}

export function MobileBottomNav({
  isAuthenticated,
  mode,
}: MobileBottomNavProps) {
  const pathname = usePathname() ?? "/";
  const chatUnread = useChatUnreadTotal(isAuthenticated);
  const chatBadge = chatUnread.data ?? 0;

  if (shouldHideBottomNav(pathname)) return null;

  const guestTabs: TabItem[] = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      match: (p) => p === "/",
    },
    {
      href: "/search",
      label: "Search",
      icon: Search,
      match: (p) => p.startsWith("/search") || p.startsWith("/categories"),
    },
    {
      href: "/login?next=/wishlist",
      label: "Wishlist",
      icon: Heart,
      match: (p) => p.startsWith("/wishlist"),
    },
    {
      href: "/login?next=/rentals",
      label: "Rentals",
      icon: Package,
      match: (p) => p.startsWith("/rentals"),
    },
    {
      href: "/login",
      label: "Profile",
      icon: User,
      match: (p) => p.startsWith("/profile") || p.startsWith("/login"),
    },
  ];

  const buyerTabs: TabItem[] = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      match: (p) => p === "/",
    },
    {
      href: "/search",
      label: "Search",
      icon: Search,
      match: (p) => p.startsWith("/search") || p.startsWith("/categories"),
    },
    {
      href: "/wishlist",
      label: "Wishlist",
      icon: Heart,
      match: (p) => p.startsWith("/wishlist"),
    },
    {
      href: "/rentals",
      label: "Rentals",
      icon: Package,
      match: (p) =>
        p.startsWith("/rentals") &&
        !p.includes("/handover") &&
        !p.includes("/return"),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      match: (p) => p === "/profile" || /^\/profile\/[^/]+$/.test(p),
    },
  ];

  const sellerTabs: TabItem[] = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      match: (p) => p === "/",
    },
    {
      href: "/search",
      label: "Search",
      icon: Search,
      match: (p) => p.startsWith("/search") || p.startsWith("/categories"),
    },
    {
      href: "/seller/listings",
      label: "Listings",
      icon: Store,
      match: (p) => p.startsWith("/seller/listings"),
    },
    {
      href: "/seller/rentals",
      label: "Requests",
      icon: Package,
      match: (p) => p.startsWith("/seller/rentals"),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      match: (p) => p === "/profile",
    },
  ];

  const tabs = !isAuthenticated
    ? guestTabs
    : mode === "SELLER"
      ? sellerTabs
      : buyerTabs;

  return (
    <nav
      aria-label="Mobile primary"
      className="border-border/60 bg-background/95 fixed inset-x-0 bottom-0 z-[45] border-t backdrop-blur-md md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <ul className="mx-auto flex h-[var(--mobile-bottom-nav-height)] max-w-lg items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const badge = tab.href === "/chat" ? chatBadge : (tab.badge ?? 0);

          return (
            <li key={tab.href} className="flex min-w-0 flex-1">
              <Link
                href={tab.href}
                prefetch
                className={cn(
                  "text-muted-foreground relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[0.65rem] font-medium transition-colors",
                  active && "text-brand-blue",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative inline-flex">
                  <Icon
                    className={cn("size-5", active && "text-brand-blue")}
                    aria-hidden
                  />
                  {badge > 0 ? (
                    <span
                      className="bg-brand-green absolute -top-1.5 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[0.6rem] font-bold text-white"
                      aria-hidden
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
