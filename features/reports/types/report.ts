import type { ReportTargetType, ReportType } from "@prisma/client";

export type ReportActionResult =
  | { ok: true; data: { reportId: string } }
  | {
      ok: false;
      error: {
        code:
          | "VALIDATION"
          | "UNAUTHORIZED"
          | "FORBIDDEN"
          | "NOT_FOUND"
          | "INTERNAL";
        message: string;
      };
    };

/** Includes REVIEW for UX; persisted as USER (+ review metadata). */
export type ReportDialogTarget = {
  targetType: ReportTargetType | "REVIEW";
  targetId: string;
  rentalId?: string | null;
  label: string;
};

export const REPORT_TYPE_OPTIONS: Array<{
  value: ReportType;
  label: string;
  description: string;
}> = [
  {
    value: "ABUSE",
    label: "Abuse or harassment",
    description: "Threatening, offensive, or harmful behavior.",
  },
  {
    value: "FRAUD",
    label: "Fraud or scam",
    description: "Misleading identity, payment, or listing details.",
  },
  {
    value: "ITEM_ISSUE",
    label: "Item issue",
    description: "Item not as described or unsafe.",
  },
  {
    value: "DISPUTE",
    label: "Rental dispute",
    description: "Handover, return, or agreement conflict.",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Something else that needs review.",
  },
];
