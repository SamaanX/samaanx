import Image from "next/image";
import Link from "next/link";

import { BRAND } from "@/config/brand";
import { APP_NAME } from "@/config/constants";
import { cn } from "@/lib/utils";

type SamaanXLogoProps = {
  href?: string | null;
  variant?: "horizontal" | "stacked" | "mark";
  className?: string;
  priority?: boolean;
  label?: string;
  /** Soft white plate — keeps logo crisp on dark navy surfaces */
  withPlate?: boolean;
};

/** Intrinsic pixel sizes of cropped PNG assets (1x). */
const VARIANT = {
  horizontal: {
    src: BRAND.assets.logo,
    width: 588,
    height: 141,
    className: "h-8 w-auto sm:h-9",
    sizes: "180px",
  },
  stacked: {
    src: BRAND.assets.logoStacked,
    width: 236,
    height: 142,
    className: "h-16 w-auto",
    sizes: "160px",
  },
  mark: {
    src: BRAND.assets.mark,
    width: 132,
    height: 141,
    className: "size-8 sm:size-9",
    sizes: "36px",
  },
} as const;

/**
 * Official SamaanX logo (PNG source of truth).
 * Served unoptimized to avoid WebP/AVIF resampling blur.
 * No opacity / blur / brightness / grayscale / CSS filters.
 */
export function SamaanXLogo({
  href = "/",
  variant = "horizontal",
  className,
  priority = false,
  label = APP_NAME,
  withPlate = true,
}: SamaanXLogoProps) {
  const meta = VARIANT[variant];

  const image = (
    <Image
      src={meta.src}
      alt={label}
      width={meta.width}
      height={meta.height}
      priority={priority}
      quality={100}
      unoptimized
      sizes={meta.sizes}
      className={cn(
        "brand-logo object-contain object-left",
        meta.className,
        !withPlate && className,
      )}
      style={{
        filter: "none",
        opacity: 1,
        mixBlendMode: "normal",
      }}
      draggable={false}
    />
  );

  const content = withPlate ? (
    <span
      className={cn("brand-logo-plate inline-flex items-center", className)}
    >
      {image}
    </span>
  ) : (
    image
  );

  if (href === null) {
    return content;
  }

  return (
    <Link
      href={href}
      className="focus-visible:ring-ring inline-flex items-center focus-visible:rounded-lg focus-visible:ring-2 focus-visible:outline-none"
      aria-label={label}
    >
      {content}
    </Link>
  );
}
