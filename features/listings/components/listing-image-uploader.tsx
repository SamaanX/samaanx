"use client";

import { GripVertical, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/features/listings/components/form-message";
import {
  LISTING_IMAGE_MAX,
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_MIME_TYPES,
  LISTING_IMAGE_MIN,
} from "@/features/listings/schemas/listing";
import { cn } from "@/lib/utils";

export type DraftListingImage =
  | {
      key: string;
      kind: "existing";
      id: string;
      previewUrl: string;
      progress: number;
    }
  | {
      key: string;
      kind: "new";
      file: File;
      previewUrl: string;
      progress: number;
    };

type ListingImageUploaderProps = {
  images: DraftListingImage[];
  onChange: (images: DraftListingImage[]) => void;
  uploading?: boolean;
  disabled?: boolean;
};

function createKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ListingImageUploader({
  images,
  onChange,
  uploading = false,
  disabled = false,
}: ListingImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    return () => {
      for (const image of images) {
        if (image.kind === "new") {
          URL.revokeObjectURL(image.previewUrl);
        }
      }
    };
    // Only revoke on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateAndAppend(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const incoming = Array.from(fileList);
    if (images.length + incoming.length > LISTING_IMAGE_MAX) {
      setError(`You can upload up to ${LISTING_IMAGE_MAX} photos.`);
      return;
    }

    const next: DraftListingImage[] = [...images];

    for (const file of incoming) {
      if (
        !(LISTING_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
      ) {
        setError("Photos must be JPG, PNG, or WebP.");
        return;
      }
      if (file.size > LISTING_IMAGE_MAX_BYTES) {
        setError("Each photo must be 5 MB or smaller.");
        return;
      }
      next.push({
        key: createKey(),
        kind: "new",
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
      });
    }

    onChange(next);
  }

  function removeAt(index: number) {
    const target = images[index];
    if (!target) return;
    if (target.kind === "new") {
      URL.revokeObjectURL(target.previewUrl);
    }
    onChange(images.filter((_, i) => i !== index));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    onChange(next);
  }

  function onDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    move(dragIndex, targetIndex);
    setDragIndex(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Photos</p>
          <p className="text-muted-foreground text-xs">
            {LISTING_IMAGE_MIN}–{LISTING_IMAGE_MAX} images · JPG/PNG/WebP · max
            5 MB each
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl"
          disabled={disabled || uploading || images.length >= LISTING_IMAGE_MAX}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="size-4" aria-hidden />
          Add
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={LISTING_IMAGE_MIME_TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={(event) => {
            validateAndAppend(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {images.length === 0 ? (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 focus-visible:ring-ring flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ImagePlus className="size-6" aria-hidden />
          Tap to add photos
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li
              key={image.key}
              draggable={!disabled && !uploading}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(index)}
              className={cn(
                "group border-border bg-card relative overflow-hidden rounded-2xl border",
                dragIndex === index && "opacity-60",
              )}
            >
              <div className="relative aspect-square">
                <Image
                  src={image.previewUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="160px"
                />
                {(uploading || image.progress > 0) && image.progress < 100 ? (
                  <div className="bg-background/80 absolute inset-x-0 bottom-0 p-2">
                    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-foreground h-full rounded-full transition-all"
                        style={{ width: `${Math.max(image.progress, 8)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <button
                  type="button"
                  className="text-muted-foreground hover:bg-muted inline-flex size-9 items-center justify-center rounded-lg"
                  aria-label="Drag to reorder"
                  disabled={disabled || uploading}
                  onClick={() => move(index, Math.max(0, index - 1))}
                >
                  <GripVertical className="size-4" aria-hidden />
                </button>
                <span className="text-muted-foreground text-xs">
                  {index + 1}/{images.length}
                </span>
                <button
                  type="button"
                  className="text-destructive hover:bg-destructive/10 inline-flex size-9 items-center justify-center rounded-lg"
                  aria-label="Remove photo"
                  disabled={disabled || uploading}
                  onClick={() => removeAt(index)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormMessage message={error} />
    </div>
  );
}

export function draftImagesToKeepIds(images: DraftListingImage[]): string[] {
  return images
    .filter(
      (image): image is Extract<DraftListingImage, { kind: "existing" }> =>
        image.kind === "existing",
    )
    .map((image) => image.id);
}

export function draftImagesToFiles(images: DraftListingImage[]): File[] {
  return images
    .filter(
      (image): image is Extract<DraftListingImage, { kind: "new" }> =>
        image.kind === "new",
    )
    .map((image) => image.file);
}
