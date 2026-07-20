import { APP_NAME } from "@/config/constants";

function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Build an absolute canonical URL for a given path.
 * Does not require Supabase env — safe for metadata generation.
 */
export function absoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, getAppBaseUrl()).toString();
}

export function defaultOpenGraphImage() {
  return {
    url: absoluteUrl("/icons/icon-512.png"),
    width: 512,
    height: 512,
    alt: APP_NAME,
  };
}
