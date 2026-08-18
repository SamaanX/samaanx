/** Client session flags for post-login push permission UX. */

export const PUSH_PROMPT_FLAG_KEY = "samaanx-push-prompt";

export function markPushPromptPending(): void {
  try {
    sessionStorage.setItem(PUSH_PROMPT_FLAG_KEY, "1");
  } catch {
    // Ignore private mode / quota.
  }
}

export function consumePushPromptPending(): boolean {
  try {
    const pending = sessionStorage.getItem(PUSH_PROMPT_FLAG_KEY) === "1";
    if (pending) {
      sessionStorage.removeItem(PUSH_PROMPT_FLAG_KEY);
    }
    return pending;
  } catch {
    return false;
  }
}

export function peekPushPromptPending(): boolean {
  try {
    return sessionStorage.getItem(PUSH_PROMPT_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}
