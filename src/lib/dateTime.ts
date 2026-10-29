// Utility functions for US Eastern Time (South Carolina, USA - America/New_York)

export const SC_TIMEZONE = 'America/New_York';

/**
 * Returns today's date formatted as YYYY-MM-DD in South Carolina local time.
 */
export function getTodayInSouthCarolina(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Formats a date or timestamp in South Carolina time.
 */
export function formatDateTimeInSC(
  dateInput: Date | any,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '';
  const date = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleString(locale, {
    timeZone: SC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  });
}

/**
 * Formats just the date portion in South Carolina time.
 */
export function formatDateInSC(
  dateInput: Date | any,
  locale: string = 'en-US'
): string {
  if (!dateInput) return '';
  const date = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString(locale, {
    timeZone: SC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Formats just the time portion in South Carolina time (e.g., 02:30 PM).
 */
export function formatTimeInSC(
  dateInput: Date | any,
  locale: string = 'en-US'
): string {
  if (!dateInput) return '';
  const date = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString(locale, {
    timeZone: SC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Safely parses a "YYYY-MM-DD" date string and returns the day of the week (0 = Sunday ... 6 = Saturday)
 * without timezone drift.
 */
export function getDayOfWeekFromDateString(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day, 12, 0, 0); // Noon avoids daylight saving boundaries
  return d.getDay();
}
