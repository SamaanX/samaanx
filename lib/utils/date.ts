/**
 * Shared date helpers — infrastructure only.
 * No business-domain date rules here.
 */

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function parseDate(value: string): Date | null {
  const date = new Date(value);
  return isValidDate(date) ? date : null;
}
