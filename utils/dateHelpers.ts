import { format, parse, addDays as fnsAddDays, addHours as fnsAddHours } from 'date-fns';

/**
 * Converts a Date object to a local date string in YYYY-MM-DD format
 * This is a critical function for consistent timezone handling across the application
 *
 * @param date The date to convert
 * @returns ISO formatted date string without time component in local timezone
 */
export function toLocalDate(date: Date): string {
  // Use the local date parts rather than UTC to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Add days to a date
 * @param date The base date
 * @param days Number of days to add
 * @returns A new Date with the days added
 */
export function addDays(date: Date, days: number): Date {
  return fnsAddDays(date, days);
}

/**
 * Add hours to a date
 * @param date The base date
 * @param hours Number of hours to add
 * @returns A new Date with the hours added
 */
export function addHours(date: Date, hours: number): Date {
  return fnsAddHours(date, hours);
}

/**
 * Set time to beginning of day (00:00:00.000)
 * @param date The date to set to start of day
 * @returns A new Date set to the beginning of the day
 */
export function startOfDay(date: Date): Date {
  const newDate = new Date(date);
  // Use local timezone hours, not UTC
  newDate.setHours(0, 0, 0, 0);
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
 * Format date to compact format
 * @param date The date to format
 * @returns Formatted date string (e.g., "Jan 1, 2023")
 */
export function formatCompactDate(date: Date): string {
  return format(date, 'MMM d, yyyy');
}

/**
 * Format day of week in short form (e.g., "Mon", "Tue")
 * @param date The date to format
 * @returns Formatted weekday string (e.g., "Mon")
 */
export function formatWeekday(date: Date): string {
  return format(date, 'EEE');
}

/**
 * Format date and time together
 * @param date The date to format
 * @param time Time string in format "HH:mm"
 * @returns Formatted date and time string
 */
export function formatDateAndTime(date: Date, time: string): string {
  return `${formatDate(date)} at ${formatTime(time)}`;
}

/**
 * Safely parse a date string to a Date object
 * @param dateString Date string to parse
 * @returns Date object or null if invalid
 */
export function safeParseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Check if a date is in the past
 * @param date Date to check
 * @returns true if date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj < today;
}

/**
 * Time slots available for booking
 * Always keep this in sync with the frontend time slots
 */
export const TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
