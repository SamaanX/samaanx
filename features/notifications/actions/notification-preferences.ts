"use server";

import { z } from "zod";

import { getNotificationPreferences } from "@/features/notifications/services/preferences";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { isEmailConfigured } from "@/lib/email/client";
import { sendBrandedEmail } from "@/lib/email/send";
import { buildWelcomeEmail } from "@/lib/email/types";

const preferencesSchema = z.object({
  notifyEmailEnabled: z.boolean().optional(),
  notifyPushEnabled: z.boolean().optional(),
  notifyChatEnabled: z.boolean().optional(),
  notifyRentalEnabled: z.boolean().optional(),
  notifyMarketingEnabled: z.boolean().optional(),
  notifyWeeklyDigestEnabled: z.boolean().optional(),
});

export async function getNotificationPreferencesAction() {
  const { profile } = await requireUser();
  const prefs = await getNotificationPreferences(profile.id);
  if (!prefs) return null;
  const { email: _email, displayName: _name, ...view } = prefs;
  return view;
}

export async function updateNotificationPreferencesAction(
  input: unknown,
): Promise<{ ok: boolean }> {
  try {
    const { profile } = await requireUser();
    const parsed = preferencesSchema.safeParse(input);
    if (!parsed.success) return { ok: false };

    await prisma.profile.update({
      where: { id: profile.id },
      data: parsed.data,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function dismissPushPromptAction(): Promise<{ ok: boolean }> {
  try {
    const { profile } = await requireUser();
    await prisma.profile.update({
      where: { id: profile.id },
      data: { pushPromptDismissedAt: new Date() },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Sends a one-off test email to the logged-in user's profile email. */
export async function sendTestEmailAction(): Promise<{
  ok: boolean;
  error?: string;
  to?: string;
}> {
  try {
    const { profile } = await requireUser();

    if (!isEmailConfigured()) {
      return { ok: false, error: "RESEND_API_KEY is not configured in .env" };
    }

    const prefs = await getNotificationPreferences(profile.id);
    if (!prefs?.email) {
      return { ok: false, error: "No email on your profile." };
    }

    const content = buildWelcomeEmail(prefs.displayName);
    const result = await sendBrandedEmail({
      userId: profile.id,
      to: prefs.email,
      displayName: prefs.displayName,
      dedupeKey: `test:${profile.id}:${Date.now()}`,
      ...content,
      subject: "SamaanX test email — delivery check",
      headline: "Test email",
      body: `This is a test from SamaanX. If you received this, Resend is working. Your account email is ${prefs.email}.`,
    });

    if (!result.ok) {
      return {
        ok: false,
        error: result.skipped ?? "Send failed — check terminal logs.",
        to: prefs.email,
      };
    }

    return { ok: true, to: prefs.email };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
