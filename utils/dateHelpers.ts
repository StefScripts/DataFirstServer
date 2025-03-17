import { format, parse } from 'date-fns';

/**
 * Converts a Date object to a local date string in YYYY-MM-DD format
 * @param date The date to convert
 * @returns ISO formatted date string without time component
 */
export function toLocalDate(date: Date): string {
  // Return UTC date string without timezone conversion
  return date.toISOString().split('T')[0];
}

/**
 * Add days to a date
 * @param date The base date
 * @param days Number of days to add
 * @returns A new Date with the days added
 */
export function addDays(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setUTCDate(newDate.getUTCDate() + days);
  return newDate;
}

/**
 * Add hours to a date
 * @param date The base date
 * @param hours Number of hours to add
 * @returns A new Date with the hours added
 */
export function addHours(date: Date, hours: number): Date {
  const newDate = new Date(date);
  newDate.setUTCHours(newDate.getUTCHours() + hours);
  return newDate;
}

/**
 * Set time to beginning of day (00:00:00.000)
 * @param date The date to set to start of day
 * @returns A new Date set to the beginning of the day
 */
export function startOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setUTCHours(0, 0, 0, 0);
  return newDate;
}

/**
 * Format time from 24-hour format to am/pm format
 * @param time Time string in format "HH:mm"
 * @returns Formatted time string (e.g., "10:00 AM")
 */
export function formatTime(time: string): string {
  return format(parse(time, 'HH:mm', new Date()), 'h:mm a');
}

/**
 * Format date to a user-friendly string
 * @param date The date to format
 * @returns Formatted date string (e.g., "Monday, January 1, 2023")
 */
export function formatDate(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy');
}

/**
 * Time slots available for booking
 * Always keep this in sync with the frontend time slots
 */
export const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
