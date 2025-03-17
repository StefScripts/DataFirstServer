import { db } from '../db/index';
import { bookings, blockedSlots } from '../db/schema';
import { eq, and, gte, asc, inArray } from 'drizzle-orm';
import { AppError } from '../utils/errorHandler';
import { toLocalDate, TIME_SLOTS } from '../utils/dateHelpers';
import { generateToken } from '../utils/email';
import { sendBookingConfirmation, sendBookingUpdatedEmail, sendBookingCancelledEmail } from '../utils/email';

/**
 * Service for handling booking-related operations
 */
export class BookingService {
  /**
   * Check if a specific time slot is available
   */
  async checkSlotAvailability(date: Date, time: string): Promise<boolean> {
    const [existingBooking, blockedSlot] = await Promise.all([
      db.query.bookings.findFirst({
        where: and(eq(bookings.date, toLocalDate(date)), eq(bookings.time, time), eq(bookings.cancelled, false))
      }),
      db.query.blockedSlots.findFirst({
        where: and(eq(blockedSlots.date, toLocalDate(date)), eq(blockedSlots.time, time))
      })
    ]);

    return !existingBooking && !blockedSlot;
  }

  /**
   * Get availability for a specific date
   */
  async getAvailability(date: Date, minimumNoticeHours: number = 20) {
    const requestDate = new Date(date);
    const now = new Date();
    const minimumNoticeDate = new Date(now.getTime() + minimumNoticeHours * 60 * 60 * 1000);

    // Get all bookings and blocked slots for the specified date
    const [bookedSlots, blockedTimeSlots] = await Promise.all([
      db.query.bookings.findMany({
        where: and(eq(bookings.date, toLocalDate(requestDate)), eq(bookings.cancelled, false)),
        columns: { time: true }
      }),
      db.query.blockedSlots.findMany({
        where: eq(blockedSlots.date, toLocalDate(requestDate)),
        columns: { time: true }
      })
    ]);

    // Combine booked and blocked times
    const unavailableTimes = new Set([...bookedSlots.map((slot) => slot.time), ...blockedTimeSlots.map((slot) => slot.time)]);

    // Mark slots within minimum notice hours as unavailable
    TIME_SLOTS.forEach((slot) => {
      const [hours] = slot.split(':').map(Number);
      const slotDate = new Date(requestDate);
      slotDate.setUTCHours(hours);

      if (slotDate < minimumNoticeDate) {
        unavailableTimes.add(slot);
      }
    });

    return { unavailableTimes: Array.from(unavailableTimes) };
  }

  /**
   * Find the next available date
   */
  async getNextAvailableDate(minimumNoticeHours: number = 20) {
    const now = new Date();
    const minimumNoticeDate = new Date(now.getTime() + minimumNoticeHours * 60 * 60 * 1000);
    let checkDate = new Date(now);
    checkDate.setUTCHours(0, 0, 0, 0); // Start of day
    let foundAvailableSlot = false;

    // Immediately move to next business day if current day is weekend
    while (checkDate.getUTCDay() === 0 || checkDate.getUTCDay() === 6) {
      checkDate.setUTCDate(checkDate.getUTCDate() + 1);
    }

    // Check up to 30 days ahead
    while (!foundAvailableSlot && checkDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      // Skip weekends
      if (checkDate.getUTCDay() !== 0 && checkDate.getUTCDay() !== 6) {
        const dateString = toLocalDate(checkDate);

        // Get unavailable slots for this date
        const [bookedSlots, blockedTimeSlots] = await Promise.all([
          db.query.bookings.findMany({
            where: and(eq(bookings.date, dateString), eq(bookings.cancelled, false)),
            columns: { time: true }
          }),
          db.query.blockedSlots.findMany({
            where: eq(blockedSlots.date, dateString),
            columns: { time: true }
          })
        ]);

        const unavailableTimes = new Set([...bookedSlots.map((slot) => slot.time), ...blockedTimeSlots.map((slot) => slot.time)]);

        // Mark slots within minimum notice hours as unavailable
        TIME_SLOTS.forEach((slot) => {
          const [hours] = slot.split(':').map(Number);
          const slotDate = new Date(checkDate);
          slotDate.setUTCHours(hours);

          if (slotDate < minimumNoticeDate) {
            unavailableTimes.add(slot);
          }
        });

        // If any time slot is available on this day
        if (unavailableTimes.size < TIME_SLOTS.length) {
          foundAvailableSlot = true;
          break;
        }
      }

      // Move to next day
      checkDate.setUTCDate(checkDate.getUTCDate() + 1);
    }

    if (foundAvailableSlot) {
      return { nextAvailableDate: checkDate.toISOString() };
    } else {
      throw new AppError('No available slots found in the next 30 days', 404);
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData: { name: string; email: string; company: string; message?: string; date: Date; time: string }) {
    const { name, email, company, message, date, time } = bookingData;

    // Check for existing upcoming bookings with the same email
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const existingUpcomingBooking = await db.query.bookings.findFirst({
      where: and(eq(bookings.email, email), eq(bookings.cancelled, false), gte(bookings.date, toLocalDate(today)))
    });

    if (existingUpcomingBooking) {
      throw new AppError(
        'You already have an upcoming consultation scheduled. Please check your confirmation email to manage your booking, or contact us for assistance.',
        409
      );
    }

    // Check availability
    const isAvailable = await this.checkSlotAvailability(date, time);
    if (!isAvailable) {
      throw new AppError('This time slot is not available', 409);
    }

    // Generate confirmation token
    const confirmationToken = generateToken();

    // Create booking object with only valid schema columns
    const bookingInsert = {
      name,
      email,
      company,
      date: toLocalDate(date),
      time,
      confirmationToken
    };

    // Handle message field separately if it exists in the schema
    if (message) {
      bookingInsert[bookings.message.name] = message;
    }

    // Set default values using column references to avoid TypeScript errors
    bookingInsert[bookings.confirmed.name] = false;
    bookingInsert[bookings.cancelled.name] = false;

    // Create the booking
    const [newBooking] = await db.insert(bookings).values(bookingInsert).returning();

    // Send confirmation email
    await sendBookingConfirmation({
      id: newBooking.id,
      name,
      email,
      date,
      time,
      company,
      confirmationToken
    });

    return newBooking;
  }

  /**
   * Get booking by confirmation token
   */
  async getBookingByToken(token: string) {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.confirmationToken, token)
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    return booking;
  }

  /**
   * Confirm a booking
   */
  async confirmBooking(token: string) {
    const booking = await this.getBookingByToken(token);

    if (booking.confirmed) {
      return { message: 'Booking was already confirmed', booking };
    }

    // Update the booking using column reference
    const updateData = {};
    updateData[bookings.confirmed.name] = true;

    const [updatedBooking] = await db.update(bookings).set(updateData).where(eq(bookings.confirmationToken, token)).returning();

    return { message: 'Booking confirmed successfully', booking: updatedBooking };
  }

  /**
   * Update booking date and time
   */
  async updateBooking(token: string, date: Date, time: string) {
    const booking = await this.getBookingByToken(token);

    // Check if new slot is available
    const isAvailable = await this.checkSlotAvailability(date, time);
    if (!isAvailable) {
      throw new AppError('Selected time slot is not available', 409);
    }

    // Update the booking
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        date: toLocalDate(date),
        time
      })
      .where(eq(bookings.confirmationToken, token))
      .returning();

    // Send update confirmation email
    await sendBookingUpdatedEmail({
      name: updatedBooking.name,
      email: updatedBooking.email,
      newDate: date,
      newTime: updatedBooking.time,
      company: updatedBooking.company
    });

    return { message: 'Booking updated successfully', booking: updatedBooking };
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(token: string) {
    const booking = await this.getBookingByToken(token);

    if (booking.cancelled) {
      return { message: 'Booking was already cancelled', booking };
    }

    // Cancel the booking using column reference
    const updateData = {};
    updateData[bookings.cancelled.name] = true;

    const [cancelledBooking] = await db.update(bookings).set(updateData).where(eq(bookings.confirmationToken, token)).returning();

    // Send cancellation email
    const bookingDate = new Date(booking.date);
    await sendBookingCancelledEmail({
      name: booking.name,
      email: booking.email,
      date: bookingDate,
      time: booking.time
    });

    return { message: 'Booking cancelled successfully', booking: cancelledBooking };
  }

  /**
   * Get upcoming consultations (admin only)
   */
  async getUpcomingConsultations() {
    const now = new Date();
    const consultations = await db.query.bookings.findMany({
      where: and(gte(bookings.date, toLocalDate(now)), eq(bookings.cancelled, false)),
      orderBy: [asc(bookings.date), asc(bookings.time)]
    });

    return consultations;
  }

  /**
   * Cancel a consultation (admin only)
   */
  async cancelConsultationById(id: number) {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, id)
    });

    if (!booking) {
      throw new AppError('Consultation not found', 404);
    }

    // Cancel the booking using column reference
    const updateData = {};
    updateData[bookings.cancelled.name] = true;

    const [cancelledBooking] = await db.update(bookings).set(updateData).where(eq(bookings.id, id)).returning();

    // Send cancellation email
    const bookingDate = new Date(booking.date);
    await sendBookingCancelledEmail({
      name: booking.name,
      email: booking.email,
      date: bookingDate,
      time: booking.time
    });

    return { message: 'Consultation cancelled successfully', booking: cancelledBooking };
  }
}
