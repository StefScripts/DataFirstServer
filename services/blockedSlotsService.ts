import { db } from '../db/index';
import { bookings, blockedSlots } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { AppError } from '../utils/errorHandler';
import { toLocalDate } from '../utils/dateHelpers';

/**
 * Service for handling blocked time slots
 */
export class BlockedSlotsService {
  /**
   * Get blocked and booked slots for a specific date
   */
  async getSlotsByDate(date: Date) {
    const dateStr = toLocalDate(date);

    // Get both blocked and booked slots
    const [blockedTimeSlots, bookedTimeSlots] = await Promise.all([
      db.query.blockedSlots.findMany({
        where: eq(blockedSlots.date, dateStr),
        columns: { time: true }
      }),
      db.query.bookings.findMany({
        where: and(eq(bookings.date, dateStr), eq(bookings.cancelled, false)),
        columns: { time: true }
      })
    ]);

    return {
      blockedTimes: blockedTimeSlots.map((slot) => slot.time),
      bookedTimes: bookedTimeSlots.map((slot) => slot.time)
    };
  }

  /**
   * Block a single time slot
   */
  async blockTimeSlot(date: Date, time: string, reason: string = '') {
    const dateStr = toLocalDate(date);

    // Check if slot is already blocked
    const existingBlock = await db.query.blockedSlots.findFirst({
      where: and(eq(blockedSlots.date, dateStr), eq(blockedSlots.time, time))
    });

    if (existingBlock) {
      throw new AppError('This time slot is already blocked', 409);
    }

    // Check if slot is already booked
    const existingBooking = await db.query.bookings.findFirst({
      where: and(eq(bookings.date, dateStr), eq(bookings.time, time), eq(bookings.cancelled, false))
    });

    if (existingBooking) {
      throw new AppError('This time slot already has a booking', 409);
    }

    // Create the base insert object with TypeScript-validated fields
    const blockedSlotData = {
      date: dateStr,
      time
    };

    // Add reason using column reference
    blockedSlotData[blockedSlots.reason.name] = reason;

    // Create the blocked slot
    const [newBlockedSlot] = await db.insert(blockedSlots).values(blockedSlotData).returning();

    return { message: 'Time slot blocked successfully', blockedSlot: newBlockedSlot };
  }

  /**
   * Block multiple time slots
   */
  async blockBulkTimeSlots(dates: Date[], times: string[], reason: string = '') {
    if (!dates.length || !times.length) {
      throw new AppError('Dates and times arrays are required', 400);
    }

    const results = {
      successful: [] as { date: string; times: string[] }[],
      conflicts: [] as { date: string; times: string[] }[]
    };

    // Process each date
    for (const date of dates) {
      const dateStr = toLocalDate(date);
      const dateResults = {
        successful: [] as string[],
        conflicts: [] as string[]
      };

      // Check for existing blocked or booked slots
      const [existingBlocked, existingBooked] = await Promise.all([
        db.query.blockedSlots.findMany({
          where: eq(blockedSlots.date, dateStr),
          columns: { time: true }
        }),
        db.query.bookings.findMany({
          where: and(eq(bookings.date, dateStr), eq(bookings.cancelled, false)),
          columns: { time: true }
        })
      ]);

      // Check each time slot for conflicts
      const unavailableTimes = new Set([...existingBlocked.map((slot) => slot.time), ...existingBooked.map((slot) => slot.time)]);

      // Separate times into conflicts and available
      times.forEach((time) => {
        if (unavailableTimes.has(time)) {
          dateResults.conflicts.push(time);
        } else {
          dateResults.successful.push(time);
        }
      });

      // If there are any non-conflicting times, block them
      if (dateResults.successful.length > 0) {
        const blockedSlotValues = dateResults.successful.map((time) => ({
          date: dateStr,
          time,
          reason
        }));

        await db.insert(blockedSlots).values(blockedSlotValues);
        results.successful.push({
          date: dateStr,
          times: dateResults.successful
        });
      }

      // Record conflicts if any
      if (dateResults.conflicts.length > 0) {
        results.conflicts.push({
          date: dateStr,
          times: dateResults.conflicts
        });
      }
    }

    // Return results with appropriate status code
    const hasConflicts = results.conflicts.length > 0;
    const hasSuccesses = results.successful.length > 0;

    if (!hasSuccesses && hasConflicts) {
      throw new AppError('All selected time slots have conflicts', 409, results);
    }

    return {
      message: hasConflicts ? 'Some time slots were blocked successfully, but there were conflicts' : 'All time slots were blocked successfully',
      results
    };
  }

  /**
   * Block recurring time slots
   */
  async blockRecurringTimeSlots(daysOfWeek: string[], numberOfWeeks: number, times: string[], reason: string = 'Recurring block') {
    if (!daysOfWeek.length || !times.length || !numberOfWeeks) {
      throw new AppError('Days of week, number of weeks, and times are required', 400);
    }

    // Generate all dates for the selected days and weeks
    const dates: Date[] = [];
    const now = new Date();

    for (let week = 0; week < numberOfWeeks; week++) {
      for (const dayOfWeek of daysOfWeek) {
        let date = new Date(now);
        date.setUTCDate(date.getUTCDate() + week * 7);

        const currentDayOfWeek = date.getUTCDay();
        const targetDayOfWeek = Number(dayOfWeek);

        // Calculate days to add to get to the target day this week
        const daysToAdd = (targetDayOfWeek - currentDayOfWeek + 7) % 7;
        date.setUTCDate(date.getUTCDate() + daysToAdd);

        dates.push(date);
      }
    }

    // Use the existing bulk blocking mechanism
    return this.blockBulkTimeSlots(dates, times, reason);
  }

  /**
   * Unblock time slots
   */
  async unblockTimeSlots(date: Date, times: string[]) {
    if (!times.length) {
      throw new AppError('Times array is required', 400);
    }

    const dateStr = toLocalDate(date);

    // Delete the specified blocked slots
    const deletedSlots = await db
      .delete(blockedSlots)
      .where(and(eq(blockedSlots.date, dateStr), inArray(blockedSlots.time, times)))
      .returning();

    return {
      message: 'Time slots unblocked successfully',
      unblocked: deletedSlots.map((slot) => slot.time)
    };
  }
}
