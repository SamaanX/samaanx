import { APP_TAGLINE, APP_TAGLINE_LINES } from "@/config/constants";
import { cn } from "@/lib/utils";

type BrandTaglineProps = {
  /** Two-line display (official line breaks) vs single-line metadata form */
  multiline?: boolean;
  className?: string;
};

/** Official tagline: Apki Cheez. Apki Income. */
export function BrandTagline({
  multiline = false,
  className,
}: BrandTaglineProps) {
  if (multiline) {
    return (
      <p className={cn("leading-snug", className)}>
        <span className="block">{APP_TAGLINE_LINES[0]}</span>
        <span className="block">{APP_TAGLINE_LINES[1]}</span>
      </p>
    );
  }

  return <p className={className}>{APP_TAGLINE}</p>;
}
