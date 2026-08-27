/**
 * Client-side listing image compression before Supabase upload.
 * Skips tiny files; resizes large dimensions; preserves quality for marketplace photos.
 */

const SKIP_COMPRESS_BELOW_BYTES = 180 * 1024;
const MAX_EDGE_PX = 2048;
const JPEG_QUALITY = 0.86;
const WEBP_QUALITY = 0.86;

function isCompressibleMime(mime: string): boolean {
  return (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/webp" ||
    mime === "image/jpg"
  );
}

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function scaledDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

function hasAlphaChannel(imageData: ImageData): boolean {
  const data = imageData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < 255) return true;
  }
  return false;
}

/**
 * Compress a listing photo when it meaningfully reduces upload size.
 * Returns the original file when compression is unnecessary or unsupported.
 */
export async function compressListingImageForUpload(
  file: File,
  mime: string,
): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!isCompressibleMime(mime)) return file;

  const needsResizeGuess =
    file.size > SKIP_COMPRESS_BELOW_BYTES || file.size > 1024 * 1024;

  if (!needsResizeGuess && file.size <= SKIP_COMPRESS_BELOW_BYTES) {
    return file;
  }

  try {
    const image = await loadImageFromFile(file);
    const { width, height } = scaledDimensions(
      image.naturalWidth,
      image.naturalWidth ? image.naturalHeight : image.height,
      MAX_EDGE_PX,
    );

    const needsResize =
      width !== image.naturalWidth || height !== image.naturalHeight;

    if (
      !needsResize &&
      file.size <= SKIP_COMPRESS_BELOW_BYTES &&
      mime !== "image/png"
    ) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(image, 0, 0, width, height);

    let outputMime = mime === "image/png" ? "image/png" : "image/jpeg";
    if (mime === "image/png") {
      const sample = ctx.getImageData(0, 0, width, height);
      if (!hasAlphaChannel(sample)) {
        outputMime = "image/jpeg";
      }
    } else if (mime === "image/webp") {
      outputMime = "image/webp";
    } else {
      outputMime = "image/jpeg";
    }

    const quality =
      outputMime === "image/jpeg"
        ? JPEG_QUALITY
        : outputMime === "image/webp"
          ? WEBP_QUALITY
          : undefined;
    const blob = await canvasToBlob(canvas, outputMime, quality);

    if (!blob) return file;

    if (blob.size >= file.size * 0.97 && !needsResize) {
      return file;
    }

    const ext = extensionForMime(outputMime);
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.${ext}`, {
      type: outputMime,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
