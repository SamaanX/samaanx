import { render } from "@react-email/render";

import BrandedEmail from "@/emails/templates/branded-email";
import { getEmailFrom, getResendClient } from "@/lib/email/client";
import { hasEmailBeenSent, recordEmailSent } from "@/lib/email/dedupe";
import { checkEmailRateLimit } from "@/lib/email/rate-limit";
import type { SendEmailParams } from "@/lib/email/types";
import { logger } from "@/lib/logger";

export async function sendBrandedEmail(
  params: SendEmailParams,
): Promise<{ ok: boolean; skipped?: string }> {
  if (!(await checkEmailRateLimit(params.userId))) {
    return { ok: false, skipped: "rate_limited" };
  }

  if (await hasEmailBeenSent(params.dedupeKey)) {
    return { ok: true, skipped: "dedupe" };
  }

  const resend = getResendClient();
  if (!resend) {
    logger.warn("sendBrandedEmail skipped — RESEND_API_KEY not configured", {
      templateKey: params.templateKey,
      userId: params.userId,
    });
    return { ok: false, skipped: "not_configured" };
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      JSON.stringify({
        level: "debug",
        message: "email.send.attempt",
        to: params.to.replace(/(.{2}).*(@.*)/, "$1***$2"),
        from: getEmailFrom(),
        templateKey: params.templateKey,
      }),
    );
  }

  const html = await render(
    BrandedEmail({
      templateKey: params.templateKey,
      preview: params.preview,
      headline: params.headline,
      body: params.body,
      ctaLabel: params.ctaLabel,
      ctaHref: params.ctaHref,
      badgeLabel: params.badgeLabel,
      badgeTone: params.badgeTone,
      listingTitle: params.listingTitle,
      listingCity: params.listingCity,
      listingPrice: params.listingPrice,
      listingImageUrl: params.listingImageUrl,
      rentalStart: params.rentalStart,
      rentalEnd: params.rentalEnd,
    }),
  );

  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to: params.to,
    subject: params.subject,
    html,
  });

  if (error) {
    logger.error("sendBrandedEmail failed", {
      message: error.message,
      templateKey: params.templateKey,
      userId: params.userId,
    });
    return { ok: false, skipped: error.message };
  }

  await recordEmailSent({
    userId: params.userId,
    templateKey: params.templateKey,
    dedupeKey: params.dedupeKey,
  });

  return { ok: true };
}
