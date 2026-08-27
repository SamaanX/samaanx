"use client";

import {
  isAllowedListingImageMime,
  LISTING_IMAGES_BUCKET,
  type ListingImageMeta,
} from "@/features/listings/schemas/listing";
import {
  buildListingImagePath,
  extensionForListingMime,
  getListingImagePublicUrl,
} from "@/features/listings/services/listing-image-storage";
import { compressListingImageForUpload } from "@/lib/images/compress-listing-image";
import { createClient } from "@/lib/supabase/client";

const UPLOAD_CONCURRENCY = 5;

function resolveListingMime(file: File): string {
  if (file.type && isAllowedListingImageMime(file.type)) {
    return file.type;
  }

  const lower = file.name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function uploadOneListingImage(params: {
  userId: string;
  listingId: string;
  file: File;
  sortOrder: number;
  stamp: number;
}): Promise<ListingImageMeta> {
  const sourceMime = resolveListingMime(params.file);
  const file = await compressListingImageForUpload(params.file, sourceMime);
  const mime = resolveListingMime(file);
  const ext = extensionForListingMime(mime);
  const objectPath = buildListingImagePath(
    params.userId,
    params.listingId,
    `${params.sortOrder}-${params.stamp}.${ext}`,
  );

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .upload(objectPath, file, {
      contentType: mime,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    storagePath: objectPath,
    url: getListingImagePublicUrl(objectPath),
    sortOrder: params.sortOrder,
    byteSize: file.size,
  };
}

/**
 * Upload listing photos directly from the browser to Supabase Storage.
 * Avoids sending large FormData through Server Actions (Vercel body limits / timeouts).
 */
export async function uploadListingImagesFromClient(params: {
  listingId: string;
  files: File[];
  startSortOrder?: number;
  onFileComplete?: (completed: number, total: number) => void;
}): Promise<ListingImageMeta[]> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.is_anonymous) {
    throw new Error("You must be signed in to upload photos.");
  }

  const userId = user.id;
  const start = params.startSortOrder ?? 0;
  const stamp = Date.now();
  const results: ListingImageMeta[] = new Array(params.files.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < params.files.length) {
      const index = nextIndex;
      nextIndex += 1;
      const file = params.files[index];
      if (!file) continue;

      results[index] = await uploadOneListingImage({
        userId,
        listingId: params.listingId,
        file,
        sortOrder: start + index,
        stamp,
      });
      params.onFileComplete?.(index + 1, params.files.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(UPLOAD_CONCURRENCY, params.files.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}
