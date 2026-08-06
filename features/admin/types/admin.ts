import type {
  AnnouncementTarget,
  DisputeStatus,
  FeedbackStatus,
  ListingModerationStatus,
  ProfileStatus,
  ReportStatus,
  UserRole,
  VerificationBadgeStatus,
} from "@prisma/client";

export type AdminActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export type AdminDashboardStats = {
  totalUsers: number;
  buyers: number;
  sellers: number;
  verifiedSellers: number;
  listings: number;
  activeListings: number;
  pendingListings: number;
  rejectedListings: number;
  rentals: number;
  completedRentals: number;
  openReports: number;
  openFeedback: number;
  openDisputes: number;
  revenuePlaceholder: number;
};

export type AdminGrowthPoint = {
  date: string;
  users: number;
  listings: number;
  rentals: number;
};

export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: ProfileStatus;
  preferredMode: string;
  verificationBadge: VerificationBadgeStatus;
  completedRentalsCount: number;
  avgRating: number;
  memberSince: string;
  lastSeenAt: string | null;
};

export type AdminListingRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  moderationStatus: ListingModerationStatus;
  moderationReason: string | null;
  sellerName: string;
  sellerId: string;
  city: string;
  createdAt: string;
};

export type AdminReportRow = {
  id: string;
  type: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: ReportStatus;
  reporterName: string;
  createdAt: string;
};

export type AdminFeedbackRow = {
  id: string;
  category: string;
  subject: string;
  message: string;
  pageUrl: string | null;
  status: FeedbackStatus;
  adminNotes: string | null;
  userName: string;
  userEmail: string;
  createdAt: string;
};

export type AdminDisputeRow = {
  id: string;
  rentalId: string;
  status: DisputeStatus;
  listingTitle: string;
  buyerName: string;
  sellerName: string;
  openedByName: string;
  createdAt: string;
};

export type AdminAuditRow = {
  id: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  createdAt: string;
};

export type AdminSearchResult = {
  users: Array<{ id: string; label: string; href: string }>;
  listings: Array<{ id: string; label: string; href: string }>;
  rentals: Array<{ id: string; label: string; href: string }>;
  reports: Array<{ id: string; label: string; href: string }>;
};

export type PlatformSettingsView = {
  maintenanceMode: boolean;
  maxActiveListingsPerSeller: number;
  maxRentalDays: number;
  defaultDepositType: string;
  supportEmail: string;
  platformAnnouncement: string | null;
};

export type AnnouncementView = {
  id: string;
  title: string;
  body: string;
  target: AnnouncementTarget;
  dismissible: boolean;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const ADMIN_PAGE_SIZE = 20;
