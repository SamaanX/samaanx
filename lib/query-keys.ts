export const queryKeys = {
  notifications: {
    all: ["notifications"] as const,
    inbox: () => [...queryKeys.notifications.all, "inbox"] as const,
    header: () => [...queryKeys.notifications.all, "header"] as const,
  },
  profile: {
    all: ["profile"] as const,
    me: () => [...queryKeys.profile.all, "me"] as const,
  },
  wishlist: {
    all: ["wishlist"] as const,
    listing: (listingId: string) =>
      [...queryKeys.wishlist.all, listingId] as const,
  },
  rentals: {
    all: ["rentals"] as const,
    buyer: () => [...queryKeys.rentals.all, "buyer"] as const,
    seller: () => [...queryKeys.rentals.all, "seller"] as const,
  },
  activity: {
    all: ["activity"] as const,
    snapshot: (mode: string) =>
      [...queryKeys.activity.all, "snapshot", mode] as const,
  },
  sellerListings: {
    all: ["seller-listings"] as const,
    list: () => [...queryKeys.sellerListings.all, "list"] as const,
  },
  categories: {
    all: ["categories"] as const,
  },
  chat: {
    all: ["chat"] as const,
    inbox: () => [...queryKeys.chat.all, "inbox"] as const,
    unreadTotal: () => [...queryKeys.chat.all, "unread-total"] as const,
    thread: (conversationId: string) =>
      [...queryKeys.chat.all, "thread", conversationId] as const,
    messages: (conversationId: string) =>
      [...queryKeys.chat.all, "messages", conversationId] as const,
  },
  reviews: {
    all: ["reviews"] as const,
    publicProfile: (id: string) =>
      [...queryKeys.reviews.all, "profile", id] as const,
    eligibility: (rentalId: string) =>
      [...queryKeys.reviews.all, "eligibility", rentalId] as const,
  },
  verification: {
    all: ["verification"] as const,
    status: (rentalId: string, stage: string) =>
      [...queryKeys.verification.all, "status", rentalId, stage] as const,
  },
  admin: {
    all: ["admin"] as const,
    dashboard: () => [...queryKeys.admin.all, "dashboard"] as const,
    users: (page?: number, q?: string) =>
      [...queryKeys.admin.all, "users", page ?? 1, q ?? ""] as const,
    listings: (page?: number, filter?: string) =>
      [...queryKeys.admin.all, "listings", page ?? 1, filter ?? ""] as const,
    reports: (page?: number) =>
      [...queryKeys.admin.all, "reports", page ?? 1] as const,
    disputes: (page?: number) =>
      [...queryKeys.admin.all, "disputes", page ?? 1] as const,
    activity: (page?: number) =>
      [...queryKeys.admin.all, "activity", page ?? 1] as const,
    feedback: (page?: number, status?: string) =>
      [...queryKeys.admin.all, "feedback", page ?? 1, status ?? ""] as const,
  },
} as const;
