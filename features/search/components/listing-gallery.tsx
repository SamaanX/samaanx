"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { cn } from "@/lib/utils";

type ListingGalleryProps = {
  images: Array<{ id: string; url: string }>;
  title: string;
};

export function ListingGallery({ images, title }: ListingGalleryProps) {
  const [index, setIndex] = React.useState(0);
  const current = images[index];

  if (images.length === 0) {
    return (
      <div className="border-border bg-muted text-muted-foreground flex aspect-[4/3] items-center justify-center rounded-2xl border text-sm">
        No photos yet
      </div>
    );
  }

  function go(delta: number) {
    setIndex((value) => (value + delta + images.length) % images.length);
  }

  return (
    <div className="space-y-3">
      <div className="border-border/80 bg-muted relative aspect-[4/3] overflow-hidden rounded-2xl border shadow-[var(--rp-shadow-sm)]">
        {current ? (
          <Image
            src={current.url}
            alt={`${title} photo ${index + 1}`}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        ) : null}

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="border-border/80 bg-card/95 text-foreground focus-visible:ring-ring absolute top-1/2 left-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-[var(--rp-shadow-xs)] focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="border-border/80 bg-card/95 text-foreground focus-visible:ring-ring absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-[var(--rp-shadow-xs)] focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Next image"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, imageIndex) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(imageIndex)}
              aria-label={`Show photo ${imageIndex + 1}`}
              aria-current={imageIndex === index}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-xl border-2",
                imageIndex === index
                  ? "border-brand-blue"
                  : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
