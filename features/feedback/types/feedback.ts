import type { FeedbackCategory } from "@prisma/client";

export type FeedbackActionResult<T = { id: string }> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export const FEEDBACK_CATEGORY_OPTIONS: {
  value: FeedbackCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "BUG",
    label: "Bug",
    description: "Something isn't working",
  },
  {
    value: "FEATURE",
    label: "Feature idea",
    description: "Suggest something new",
  },
  {
    value: "UX",
    label: "UX / design",
    description: "Improve how it feels",
  },
  {
    value: "GENERAL",
    label: "General",
    description: "Overall thoughts",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Anything else",
  },
];

export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};
