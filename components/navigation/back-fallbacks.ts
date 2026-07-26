/**
 * Sensible fallback hrefs when BackButton cannot use browser history.
 * Keep in sync with product navigation expectations.
 */
export const BACK_FALLBACKS = {
  marketplace: "/",
  search: "/search",
  categories: "/categories",
  profile: "/",
  notifications: "/",
  wishlist: "/",
  help: "/",
  buyerRentals: "/",
  sellerDashboard: "/",
  sellerListings: "/seller/listings",
  sellerRentals: "/seller/listings",
  sellerListingNew: "/seller/listings",
  sellerListingEdit: "/seller/listings",
  chat: "/chat",
  handover: "/rentals",
  returnVerification: "/rentals",
  admin: "/admin",
  settings: "/profile",
} as const;
