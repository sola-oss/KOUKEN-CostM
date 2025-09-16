// Timezone utilities for Asia/Tokyo ↔ UTC conversion
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export const TOKYO_TZ = 'Asia/Tokyo';

/**
 * Convert Tokyo time to UTC for database storage
 * @param tokyoTime - Date string in Tokyo timezone (YYYY-MM-DD HH:mm:ss or ISO format)
 * @returns ISO string in UTC
 */
export function tokyoToUtc(tokyoTime: string): string {
  return dayjs.tz(tokyoTime, TOKYO_TZ).utc().toISOString();
}

/**
 * Convert UTC time to Tokyo timezone for display
 * @param utcTime - ISO string in UTC
 * @returns Date string in Tokyo timezone (ISO format)
 */
export function utcToTokyo(utcTime: string): string {
  return dayjs.utc(utcTime).tz(TOKYO_TZ).toISOString();
}

/**
 * Get current time in UTC (for database storage)
 * @returns ISO string in UTC
 */
export function nowUtc(): string {
  return dayjs.utc().toISOString();
}

/**
 * Get current time in Tokyo timezone
 * @returns ISO string in Tokyo timezone
 */
export function nowTokyo(): string {
  return dayjs().tz(TOKYO_TZ).toISOString();
}

/**
 * Format Tokyo time for display
 * @param utcTime - ISO string in UTC
 * @param format - dayjs format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns Formatted string in Tokyo timezone
 */
export function formatTokyo(utcTime: string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs.utc(utcTime).tz(TOKYO_TZ).format(format);
}

/**
 * Get start and end of day in Tokyo timezone, converted to UTC
 * @param date - Date string (YYYY-MM-DD) in Tokyo timezone
 * @returns { start: UTC ISO string, end: UTC ISO string }
 */
export function getTokyoDayBounds(date: string): { start: string; end: string } {
  const tokyoDate = dayjs.tz(date, TOKYO_TZ);
  return {
    start: tokyoDate.startOf('day').utc().toISOString(),
    end: tokyoDate.endOf('day').utc().toISOString(),
  };
}

/**
 * Calculate minutes between two UTC timestamps
 * @param startAt - ISO string in UTC
 * @param endAt - ISO string in UTC
 * @returns Minutes (integer)
 */
export function calculateMinutes(startAt: string, endAt: string): number {
  const start = dayjs.utc(startAt);
  const end = dayjs.utc(endAt);
  return Math.max(0, end.diff(start, 'minute'));
}

/**
 * Validate date range (Tokyo timezone)
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @returns true if valid range
 */
export function isValidDateRange(from: string, to: string): boolean {
  const fromDate = dayjs.tz(from, TOKYO_TZ);
  const toDate = dayjs.tz(to, TOKYO_TZ);
  return fromDate.isValid() && toDate.isValid() && fromDate.isBefore(toDate) || fromDate.isSame(toDate);
}