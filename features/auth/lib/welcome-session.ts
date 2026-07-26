/** Client-only session flags for first-run / post-auth welcome UX. */

export const WELCOME_FLAG_KEY = "samaanx-show-welcome";
export const SPLASH_SEEN_KEY = "samaanx-splash-seen";

export function markWelcomePending(): void {
  try {
    sessionStorage.setItem(WELCOME_FLAG_KEY, "1");
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function consumeWelcomePending(): boolean {
  try {
    const pending = sessionStorage.getItem(WELCOME_FLAG_KEY) === "1";
    if (pending) {
      sessionStorage.removeItem(WELCOME_FLAG_KEY);
    }
    return pending;
  } catch {
    return false;
  }
}

export function peekWelcomePending(): boolean {
  try {
    return sessionStorage.getItem(WELCOME_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearWelcomePending(): void {
  try {
    sessionStorage.removeItem(WELCOME_FLAG_KEY);
  } catch {
    // Ignore.
  }
}
