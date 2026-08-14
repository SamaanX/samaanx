export type ActivityTone =
  "green" | "yellow" | "orange" | "blue" | "purple" | "red";

export type ActivityAlertKind = "rental" | "announcement";

export type ActivityAlert = {
  id: string;
  kind: ActivityAlertKind;
  tone: ActivityTone;
  title: string;
  description?: string;
  ctaLabel?: string;
  href?: string;
  dismissible?: boolean;
  announcementId?: string;
  /** Lower = more urgent. */
  priority: number;
};

export type ActivitySnapshot = {
  alerts: ActivityAlert[];
  /** Seller pending request count — useful for badges. */
  sellerPendingCount: number;
  buyerPendingCount: number;
  buyerApprovedCount: number;
  returnPendingCount: number;
};
