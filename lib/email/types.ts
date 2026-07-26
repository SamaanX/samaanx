import type { NotificationType } from "@prisma/client";

/** Transactional + lifecycle email template keys. */
export type EmailTemplateKey =
  | "welcome"
  | "verify_email"
  | "password_reset"
  | "rental_request_received"
  | "rental_request_approved"
  | "rental_request_rejected"
  | "handover_reminder"
  | "rental_started"
  | "return_reminder"
  | "rental_completed"
  | "review_reminder"
  | "chat_unread_reminder"
  | "security_alert"
  | "account_change"
  | "rental_cancelled"
  | "verification_ready"
  | "weekly_seller_summary"
  | "weekly_buyer_digest"
  | "listing_inactive";

export type EmailContent = {
  templateKey: EmailTemplateKey;
  subject: string;
  preview: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  badgeLabel?: string;
  badgeTone?: "success" | "warning" | "danger" | "info" | "neutral";
};

export type SendEmailParams = {
  userId: string;
  to: string;
  displayName: string;
  dedupeKey: string;
} & EmailContent & {
    listingTitle?: string;
    listingCity?: string | null;
    listingPrice?: string;
    listingImageUrl?: string | null;
    rentalStart?: string;
    rentalEnd?: string;
  };

const APP_URL = () =>
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function notificationTypeToEmailTemplate(
  type: NotificationType,
  title: string,
): EmailTemplateKey | null {
  const lower = title.toLowerCase();
  switch (type) {
    case "RENTAL_REQUESTED":
      return lower.includes("new rental")
        ? "rental_request_received"
        : "rental_request_received";
    case "RENTAL_APPROVED":
      return "rental_request_approved";
    case "RENTAL_REJECTED":
      return "rental_request_rejected";
    case "RENTAL_CANCELLED":
      return "rental_cancelled";
    case "VERIFICATION_READY":
      return lower.includes("return") ? "return_reminder" : "handover_reminder";
    case "HANDOVER_COMPLETED":
      return "rental_started";
    case "RETURN_COMPLETED":
      return "rental_completed";
    case "REVIEW_REMINDER":
      return "review_reminder";
    case "NEW_MESSAGE":
      return "chat_unread_reminder";
    case "SECURITY_ALERT":
      return "security_alert";
    case "ACCOUNT_CHANGE":
      return "account_change";
    case "SYSTEM":
      return null;
    default:
      return null;
  }
}

export function buildEmailFromNotification(input: {
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
  displayName: string;
  listingTitle?: string;
}): EmailContent | null {
  const templateKey = notificationTypeToEmailTemplate(input.type, input.title);
  if (!templateKey) return null;

  return {
    templateKey,
    subject: `${input.title} · SamaanX`,
    preview: input.body.slice(0, 120),
    headline: input.title,
    body: `Salam ${input.displayName},\n\n${input.body}`,
    ctaLabel: input.ctaLabel,
    ctaHref: `${APP_URL()}${input.href.startsWith("/") ? input.href : `/${input.href}`}`,
    badgeLabel: badgeForTemplate(templateKey),
    badgeTone: toneForTemplate(templateKey),
  };
}

function badgeForTemplate(key: EmailTemplateKey): string {
  const map: Partial<Record<EmailTemplateKey, string>> = {
    rental_request_received: "New request",
    rental_request_approved: "Approved",
    rental_request_rejected: "Update",
    handover_reminder: "Handover",
    return_reminder: "Return",
    rental_started: "Active",
    rental_completed: "Completed",
    review_reminder: "Review",
    chat_unread_reminder: "Message",
    security_alert: "Security",
    account_change: "Account",
  };
  return map[key] ?? "SamaanX";
}

function toneForTemplate(key: EmailTemplateKey): EmailContent["badgeTone"] {
  if (key === "rental_request_approved" || key === "rental_started") {
    return "success";
  }
  if (key === "rental_request_rejected" || key === "security_alert") {
    return "danger";
  }
  if (key.includes("reminder")) return "warning";
  return "info";
}

export function buildWelcomeEmail(displayName: string): EmailContent {
  return {
    templateKey: "welcome",
    subject: "Welcome to SamaanX · Apki Cheez, Apki Income",
    preview: "Start renting or earning from items near you.",
    headline: `Welcome, ${displayName}!`,
    body: "SamaanX par aapka swagat hai. Browse nearby rentals as a buyer, or list your idle items as a seller to earn extra income — safely and locally.",
    ctaLabel: "Explore SamaanX",
    ctaHref: APP_URL(),
    badgeLabel: "Welcome",
    badgeTone: "success",
  };
}

export function buildPasswordResetEmail(resetUrl: string): EmailContent {
  return {
    templateKey: "password_reset",
    subject: "Reset your SamaanX password",
    preview: "Use this link to reset your password.",
    headline: "Password reset",
    body: "We received a request to reset your password. If this was you, tap the button below. This link expires soon.",
    ctaLabel: "Reset password",
    ctaHref: resetUrl,
    badgeLabel: "Security",
    badgeTone: "warning",
  };
}

export function buildVerifyEmailEmail(verifyUrl: string): EmailContent {
  return {
    templateKey: "verify_email",
    subject: "Verify your SamaanX email",
    preview: "Confirm your email to secure your account.",
    headline: "Verify your email",
    body: "Please confirm your email address to keep your account secure and receive important rental updates.",
    ctaLabel: "Verify email",
    ctaHref: verifyUrl,
    badgeLabel: "Verify",
    badgeTone: "info",
  };
}
