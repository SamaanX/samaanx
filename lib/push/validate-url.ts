/** Allow only same-app relative paths for push deep links. */
export function sanitizePushUrl(url: string): string {
  if (!url.startsWith("/") || url.startsWith("//")) {
    return "/notifications";
  }
  if (url.includes("\\") || url.includes("\0")) {
    return "/notifications";
  }
  try {
    const parsed = new URL(url, "https://samaanx.local");
    if (parsed.origin !== "https://samaanx.local") {
      return "/notifications";
    }
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/notifications";
  }
}
