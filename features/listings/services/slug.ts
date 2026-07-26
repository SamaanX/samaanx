/**
 * SEO-friendly slug from title + uniqueness suffix.
 */
export function buildListingSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");

  const suffix = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  return `${base || "listing"}-${suffix}`;
}
