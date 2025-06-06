import { db } from '../db/index';
import { bookings, blockedSlots } from '../db/schema';
import { eq, and, gte, asc, inArray } from 'drizzle-orm';
import { AppError } from '../utils/errorHandler';
import { toLocalDate, TIME_SLOTS } from '../utils/dateHelpers';
import { generateToken } from '../utils/email';
import { sendBookingConfirmation, sendBookingUpdatedEmail, sendBookingCancelledEmail } from '../utils/email';

export class BookingService {
  // Check if a specific time slot is available
  async checkSlotAvailability(date: Date, time: string): Promise<boolean> {
    const dateStr = toLocalDate(date);

    const [existingBooking, blockedSlot] = await Promise.all([
      db.query.bookings.findFirst({
        where: and(eq(bookings.date, dateStr), eq(bookings.time, time), eq(bookings.cancelled, false))
      }),
      db.query.blockedSlots.findFirst({
        where: and(eq(blockedSlots.date, dateStr), eq(blockedSlots.time, time))
      })
    ]);

    return !existingBooking && !blockedSlot;
  }

  // Get availability for a specific date
  async getAvailability(date: Date, minimumNoticeHours: number = 20) {
    const requestDate = new Date(date);
    const now = new Date();
    const minimumNoticeDate = new Date(now.getTime() + minimumNoticeHours * 60 * 60 * 1000);

    const dateStr = toLocalDate(requestDate);

    // Get all bookings and blocked slots for the specified date
    const [bookedSlots, blockedTimeSlots] = await Promise.all([
      db.query.bookings.findMany({
        where: and(eq(bookings.date, dateStr), eq(bookings.cancelled, false)),
        columns: { time: true }
      }),
      db.query.blockedSlots.findMany({
        where: eq(blockedSlots.date, dateStr),
        columns: { time: true }
      })
    ]);

    // Combine booked and blocked times
    const unavailableTimes = new Set([...bookedSlots.map((slot) => slot.time), ...blockedTimeSlots.map((slot) => slot.time)]);

    // Mark slots within minimum notice hours as unavailable
    TIME_SLOTS.forEach((slot) => {
      const [hours, minutes = 0] = slot.split(':').map(Number);

      // Create a new date object for the slot with the correct timezone handling
      const slotDate = new Date(requestDate);

      // Set the hours in the local timezone instead of UTC
      slotDate.setHours(hours, minutes, 0, 0);

      // Compare with minimum notice date
      if (slotDate < minimumNoticeDate) {
        unavailableTimes.add(slot);
      }
    });

    return { unavailableTimes: Array.from(unavailableTimes) };
  }

  // Get the next available date with optimized querying
  async getNextAvailableDate(minimumNoticeHours: number = 20) {
    const now = new Date();
    const minimumNoticeDate = new Date(now.getTime() + minimumNoticeHours * 60 * 60 * 1000);

    // Start from current day
    let checkDate = new Date(now);
    // Use local timezone for start of day
    checkDate.setHours(0, 0, 0, 0);

    // Skip to next business day if weekend
    if (checkDate.getDay() === 0) {
      // Sunday
      checkDate.setDate(checkDate.getDate() + 1);
    } else if (checkDate.getDay() === 6) {
      // Saturday
      checkDate.setDate(checkDate.getDate() + 2);
    }

    // Calculate end date (30 days from now)
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Generate array of business days to check
    const datesToCheck: Date[] = [];
    let currentDate = new Date(checkDate);

    while (currentDate <= endDate) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        datesToCheck.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Format dates for SQL query using the corrected toLocalDate function
    const formattedDates = datesToCheck.map((date) => toLocalDate(date));

    // Get all bookings and blocked slots for these dates in a single query
    const [bookingResults, blockedSlotResults] = await Promise.all([
      db
        .select({ date: bookings.date, time: bookings.time })
        .from(bookings)
        .where(and(inArray(bookings.date, formattedDates), eq(bookings.cancelled, false))),
      db.select({ date: blockedSlots.date, time: blockedSlots.time }).from(blockedSlots).where(inArray(blockedSlots.date, formattedDates))
    ]);

    // Group by date
    const bookedSlotsByDate = new Map();
    bookingResults.forEach((booking) => {
      if (!bookedSlotsByDate.has(booking.date)) {
        bookedSlotsByDate.set(booking.date, new Set());
      }
      bookedSlotsByDate.get(booking.date).add(booking.time);
    });

    const blockedSlotsByDate = new Map();
    blockedSlotResults.forEach((slot) => {
      if (!blockedSlotsByDate.has(slot.date)) {
        blockedSlotsByDate.set(slot.date, new Set());
      }
      blockedSlotsByDate.get(slot.date).add(slot.time);
    });

    // Find first date with available slots
    for (const date of datesToCheck) {
      const dateStr = toLocalDate(date);
      const bookedTimes = bookedSlotsByDate.get(dateStr) || new Set();
      const blockedTimes = blockedSlotsByDate.get(dateStr) || new Set();

      // Combine unavailable times
      const unavailableTimes = new Set([...bookedTimes, ...blockedTimes]);

      // Check minimum notice time
      TIME_SLOTS.forEach((slot) => {
        const [hours, minutes = 0] = slot.split(':').map(Number);
        const slotDate = new Date(date);
        // Set hours in local timezone, not UTC
        slotDate.setHours(hours, minutes, 0, 0);

        if (slotDate < minimumNoticeDate) {
          unavailableTimes.add(slot);
        }
      });

      // If any time slot is available on this day
      if (unavailableTimes.size < TIME_SLOTS.length) {
        return { nextAvailableDate: date.toISOString() };
      }
    }

    throw new AppError('No available slots found in the next 30 days', 404);
  }

  // Create a new booking
  async createBooking(bookingData: { name: string; email: string; company: string; message?: string; date: Date; time: string }) {
    const { name, email, company, message, date, time } = bookingData;

    // Check for existing upcoming bookings with the same email
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = toLocalDate(today);

    const existingUpcomingBooking = await db.query.bookings.findFirst({
      where: and(eq(bookings.email, email), eq(bookings.cancelled, false), gte(bookings.date, todayStr))
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
      date: toLocalDate(date), // Format date consistently for database storage
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
      date, // Pass original date object for display formatting
      time,
      company,
      confirmationToken
    });

    return newBooking;
  }

  // Get booking by confirmation token
  async getBookingByToken(token: string) {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.confirmationToken, token)
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    return booking;
  }

  // Confirm a booking
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

  // Update booking date and time
  async updateBooking(token: string, date: Date, time: string) {
    const booking = await this.getBookingByToken(token);

    // Check if new slot is available
    const isAvailable = await this.checkSlotAvailability(date, time);
    if (!isAvailable) {
      throw new AppError('Selected time slot is not available', 409);
    }

    // Format the date consistently for database
    const dateStr = toLocalDate(date);

    // Update the booking
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        date: dateStr,
        time
      })
      .where(eq(bookings.confirmationToken, token))
      .returning();

    // Send update confirmation email
    await sendBookingUpdatedEmail({
      name: updatedBooking.name,
      email: updatedBooking.email,
      newDate: date, // Pass original date object for display formatting
      newTime: updatedBooking.time,
      company: updatedBooking.company
    });

    return { message: 'Booking updated successfully', booking: updatedBooking };
  }

  // Cancel a booking
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
    // Convert string date from database to Date object for email formatting
    const bookingDate = new Date(booking.date);
    await sendBookingCancelledEmail({
      name: booking.name,
      email: booking.email,
      date: bookingDate,
      time: booking.time
    });

    return { message: 'Booking cancelled successfully', booking: cancelledBooking };
  }

  // Get upcoming consultations with optimized query
  async getUpcomingConsultations() {
    const now = new Date();
    const todayStr = toLocalDate(now);

    // Use a single optimized query with index hint
    const consultations = await db.query.bookings.findMany({
      where: and(gte(bookings.date, todayStr), eq(bookings.cancelled, false)),
      orderBy: [asc(bookings.date), asc(bookings.time)],
      // Limit the result to improve performance
      limit: 100
    });

    return consultations;
  }

  // Cancel a consultation (admin only)
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
    // Convert string date from database to Date object
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
