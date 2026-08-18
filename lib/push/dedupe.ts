import { prisma } from "@/lib/db/prisma";

export async function hasPushBeenSent(dedupeKey: string): Promise<boolean> {
  const existing = await prisma.pushSendLog.findUnique({
    where: { dedupeKey },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function recordPushSent(params: {
  userId: string;
  dedupeKey: string;
}): Promise<void> {
  try {
    await prisma.pushSendLog.create({
      data: {
        userId: params.userId,
        dedupeKey: params.dedupeKey,
      },
    });
  } catch {
    // Unique dedupe — already sent.
  }
}
