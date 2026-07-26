import { prisma } from "@/lib/db/prisma";

export async function hasEmailBeenSent(dedupeKey: string): Promise<boolean> {
  const existing = await prisma.emailSendLog.findUnique({
    where: { dedupeKey },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function recordEmailSent(params: {
  userId: string;
  templateKey: string;
  dedupeKey: string;
}): Promise<void> {
  try {
    await prisma.emailSendLog.create({
      data: {
        userId: params.userId,
        templateKey: params.templateKey,
        dedupeKey: params.dedupeKey,
      },
    });
  } catch {
    // Unique dedupe — already sent.
  }
}
