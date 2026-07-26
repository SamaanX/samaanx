export type ActivityTone =
  "green" | "yellow" | "orange" | "blue" | "purple" | "red";

export type ActivityAlert = {
  id: string;
  tone: ActivityTone;
  title: string;
  description?: string;
  ctaLabel: string;
  href: string;
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
