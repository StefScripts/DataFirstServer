import { SelectUser } from '../db/schema';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

/**
 * Email notification type
 */
export type NotificationType = 'new' | 'rescheduled' | 'cancelled';

/**
 * Email notification parameters
 */
export interface NotificationParams {
  type: NotificationType;
  name: string;
  email: string;
  company: string;
  date: Date;
  time: string;
}

/**
 * Booking confirmation parameters
 */
export interface BookingConfirmationParams {
  id: number;
  name: string;
  email: string;
  date: Date;
  time: string;
  company: string;
  confirmationToken: string;
}

/**
 * Booking update parameters
 */
export interface BookingUpdateParams {
  name: string;
  email: string;
  newDate: Date;
  newTime: string;
  company: string;
}

/**
 * Booking cancellation parameters
 */
export interface BookingCancellationParams {
  name: string;
  email: string;
  date: Date;
  time: string;
}

/**
 * Contact form message parameters
 */
export interface ContactFormMessageParams {
  name: string;
  email: string;
  company: string;
  message: string;
}
