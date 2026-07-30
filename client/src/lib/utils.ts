import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a human-readable message from an apiRequest error.
 * apiRequest throws `Error("500: {json body}")`, so the raw message is unreadable
 * as-is. Pulls out the API's `message` field, or the list of validation errors.
 *
 * @example
 * errorMessage(new Error('500: {"message":"Item 0: 不正な値です"}')) // => 'Item 0: 不正な値です'
 */
export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const jsonStart = raw.indexOf('{');
  if (jsonStart < 0) return raw;
  try {
    const body = JSON.parse(raw.slice(jsonStart)) as {
      message?: string;
      error?: string;
      details?: { path?: (string | number)[]; message?: string }[];
    };
    if (body.details?.length) {
      return body.details
        .map(d => [(d.path || []).join('.'), d.message].filter(Boolean).join(': '))
        .join(' / ');
    }
    return body.message || body.error || raw;
  } catch {
    return raw;
  }
}

/**
 * Formats an ISO date string (with timezone) to Japanese date format (YYYY/MM/DD)
 * Extracts YYYY-MM-DD directly from the string to avoid timezone conversion issues
 * 
 * @example
 * formatDate('2025-12-31T00:00:00+09:00') // => '2025/12/31'
 * formatDate(null) // => '-'
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  // Extract YYYY-MM-DD from ISO string to avoid timezone issues
  // Input: '2025-12-31T00:00:00+09:00' -> Output: '2025/12/31'
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '-';
  const [, year, month, day] = match;
  return `${year}/${month}/${day}`;
}
