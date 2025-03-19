import { db } from '../db/index';
import { bookings, blockedSlots } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { AppError } from '../utils/errorHandler';
import { toLocalDate } from '../utils/dateHelpers';

export class BlockedSlotsService {
  // Get blocked and booked slots for a specific date
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

  // Block a single time slot
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

  // Block multiple time slots with batch processing
  async blockBulkTimeSlots(dates: Date[], times: string[], reason: string = '') {
    if (!dates.length || !times.length) {
      throw new AppError('Dates and times arrays are required', 400);
    }

    const results = {
      successful: [] as { date: string; times: string[] }[],
      conflicts: [] as { date: string; times: string[] }[]
    };

    // Convert all dates to string format once
    const dateStrings = dates.map((date) => toLocalDate(date));

    // Get all existing blocked slots and bookings in a single query for all dates
    const [existingBlocked, existingBooked] = await Promise.all([
      db.select({ date: blockedSlots.date, time: blockedSlots.time }).from(blockedSlots).where(inArray(blockedSlots.date, dateStrings)),
      db
        .select({ date: bookings.date, time: bookings.time })
        .from(bookings)
        .where(and(inArray(bookings.date, dateStrings), eq(bookings.cancelled, false)))
    ]);

    // Create maps for faster lookups
    const blockedMap = new Map<string, Set<string>>();
    existingBlocked.forEach((slot) => {
      if (!blockedMap.has(slot.date)) {
        blockedMap.set(slot.date, new Set());
      }
      blockedMap.get(slot.date)!.add(slot.time);
    });

    const bookedMap = new Map<string, Set<string>>();
    existingBooked.forEach((booking) => {
      if (!bookedMap.has(booking.date)) {
        bookedMap.set(booking.date, new Set());
      }
      bookedMap.get(booking.date)!.add(booking.time);
    });

    // Process each date without additional queries
    const slotsToInsert: { date: string; time: string; reason: string }[] = [];

    for (const dateStr of dateStrings) {
      const blockedTimes = blockedMap.get(dateStr) || new Set();
      const bookedTimes = bookedMap.get(dateStr) || new Set();
      const unavailableTimes = new Set([...blockedTimes, ...bookedTimes]);

      const availableTimes: string[] = [];
      const conflictingTimes: string[] = [];

      // Check each time for conflicts
      times.forEach((time) => {
        if (unavailableTimes.has(time)) {
          conflictingTimes.push(time);
        } else {
          availableTimes.push(time);
          // Add to insertion batch
          slotsToInsert.push({ date: dateStr, time, reason });
        }
      });

      // Record results
      if (availableTimes.length > 0) {
        results.successful.push({
          date: dateStr,
          times: availableTimes
        });
      }

      if (conflictingTimes.length > 0) {
        results.conflicts.push({
          date: dateStr,
          times: conflictingTimes
        });
      }
    }

    // Batch insert all available slots in a single query
    if (slotsToInsert.length > 0) {
      await db.insert(blockedSlots).values(slotsToInsert);
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

  // Block recurring time slots with optimized batch processing
  async blockRecurringTimeSlots(daysOfWeek: string[], numberOfWeeks: number, times: string[], reason: string = 'Recurring block') {
    if (!daysOfWeek.length || !times.length || !numberOfWeeks) {
      throw new AppError('Days of week, number of weeks, and times are required', 400);
    }

    // Generate all dates for the selected days and weeks more efficiently
    const dates: Date[] = [];
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    const daysAsNumbers = daysOfWeek.map((d) => Number(d));

    // Pre-calculate all the dates at once
    for (let week = 0; week < numberOfWeeks; week++) {
      const weekStart = new Date(now);
      weekStart.setUTCDate(weekStart.getUTCDate() + week * 7);

      // Get current day of week (0-6)
      const currentDayOfWeek = weekStart.getUTCDay();

      for (const targetDayOfWeek of daysAsNumbers) {
        // Calculate days to add to get to the target day this week
        const daysToAdd = (targetDayOfWeek - currentDayOfWeek + 7) % 7;
        const targetDate = new Date(weekStart);
        targetDate.setUTCDate(targetDate.getUTCDate() + daysToAdd);
        dates.push(targetDate);
      }
    }

    // Use the existing bulk blocking mechanism with all dates at once
    return this.blockBulkTimeSlots(dates, times, reason);
  }

  // Unblock time slots
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
