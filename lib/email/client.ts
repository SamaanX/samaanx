import { Resend } from "resend";

import { getServerEnv } from "@/config/env";

let client: Resend | null = null;

export function getResendClient(): Resend | null {
  const { RESEND_API_KEY } = getServerEnv();
  if (!RESEND_API_KEY) return null;
  client ??= new Resend(RESEND_API_KEY);
  return client;
}

export function getEmailFrom(): string {
  const { EMAIL_FROM, NEXT_PUBLIC_APP_NAME } = getServerEnv();
  return EMAIL_FROM ?? `${NEXT_PUBLIC_APP_NAME} <noreply@localhost>`;
}

export function isEmailConfigured(): boolean {
  return Boolean(getServerEnv().RESEND_API_KEY);
}
