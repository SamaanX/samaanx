import type { MessageAttachmentKind } from "@prisma/client";

import {
  CHAT_MEDIA_BUCKET,
  isChatAllowedMime,
  isChatImageMime,
} from "@/features/chat/schemas/chat";
import { createClient } from "@/lib/supabase/server";

export function buildChatMediaPath(params: {
  userId: string;
  conversationId: string;
  fileName: string;
}): string {
  const safe = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `${params.userId}/${params.conversationId}/${id}-${safe}`;
}

export function attachmentKindForMime(mime: string): MessageAttachmentKind {
  return isChatImageMime(mime) ? "IMAGE" : "DOCUMENT";
}

export async function uploadChatAttachment(params: {
  userId: string;
  conversationId: string;
  file: File;
}): Promise<{
  kind: MessageAttachmentKind;
  path: string;
  url: string;
  name: string;
  mime: string;
  size: number;
}> {
  const mime = params.file.type || "application/octet-stream";
  if (!isChatAllowedMime(mime)) {
    throw new Error("Unsupported file type.");
  }
  if (params.file.size > 10 * 1024 * 1024) {
    throw new Error("File must be 10 MB or smaller.");
  }

  const path = buildChatMediaPath({
    userId: params.userId,
    conversationId: params.conversationId,
    fileName: params.file.name || "file",
  });

  const supabase = await createClient();
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const { error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || "Upload failed.");
  }

  const { data } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(path);
  // Bucket is private — use signed URL for display; also store path for later.
  const signed = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  return {
    kind: attachmentKindForMime(mime),
    path,
    url: signed.data?.signedUrl ?? data.publicUrl,
    name: params.file.name || "file",
    mime,
    size: params.file.size,
  };
}

export async function refreshChatAttachmentUrl(
  path: string,
): Promise<string | null> {
  const supabase = await createClient();
  const signed = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24);
  return signed.data?.signedUrl ?? null;
}
