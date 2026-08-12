/** Shared Buyer / Seller UI preference helpers — no ModeProvider. */

export type AppUiMode = "BUYER" | "SELLER";

export type NavItem = {
  href: string;
  label: string;
};

export const HOME_NAV: NavItem = { href: "/", label: "Home" };

export const BUYER_NAV: readonly NavItem[] = [
  HOME_NAV,
  { href: "/search", label: "Browse" },
  { href: "/ai", label: "AI Assistant" },
  { href: "/rentals", label: "My rentals" },
  { href: "/chat", label: "Chat" },
] as const;

export const SELLER_NAV: readonly NavItem[] = [
  HOME_NAV,
  { href: "/seller/listings", label: "My listings" },
  { href: "/seller/rentals", label: "Requests" },
  { href: "/chat", label: "Chat" },
] as const;

export function navForMode(
  mode: AppUiMode,
  isAuthenticated: boolean,
): readonly NavItem[] {
  if (!isAuthenticated) {
    return [
      HOME_NAV,
      { href: "/search", label: "Browse" },
      { href: "/ai", label: "AI Assistant" },
      { href: "/categories", label: "Categories" },
    ] as const;
  }
  return mode === "SELLER" ? SELLER_NAV : BUYER_NAV;
}

export function isSellerMode(mode: AppUiMode | null | undefined): boolean {
  return mode === "SELLER";
}
