import { Request, Response } from 'express';
import { BlockedSlotsService } from '../services/blockedSlotsService';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';

const blockedSlotsService = new BlockedSlotsService();

/**
 * Controller for blocked time slots endpoints
 */
export class BlockedSlotsController {
  /**
   * Get blocked and booked slots for a specific date
   */
  async getSlotsByDate(req: Request, res: Response) {
    const { date } = req.query;

    if (!date) {
      throw new AppError('Date is required', 400);
    }

    const slots = await blockedSlotsService.getSlotsByDate(new Date(date as string));
    return sendSuccessResponse(res, slots);
  }

  /**
   * Block a single time slot
   */
  async blockTimeSlot(req: Request, res: Response) {
    const { date, time, reason } = req.body;

    if (!date || !time) {
      throw new AppError('Date and time are required', 400);
    }

    const result = await blockedSlotsService.blockTimeSlot(new Date(date), time, reason);

    return sendSuccessResponse(res, result);
  }

  /**
   * Block multiple time slots
   */
  async blockBulkTimeSlots(req: Request, res: Response) {
    const { dates, times, reason } = req.body;

    if (!dates || !times || !Array.isArray(dates) || !Array.isArray(times) || dates.length === 0 || times.length === 0) {
      throw new AppError('Dates and times arrays are required', 400);
    }

    const formattedDates = dates.map((date) => new Date(date));
    const result = await blockedSlotsService.blockBulkTimeSlots(formattedDates, times, reason || '');

    return sendSuccessResponse(res, result);
  }

  /**
   * Block recurring time slots
   */
  async blockRecurringTimeSlots(req: Request, res: Response) {
    const { daysOfWeek, numberOfWeeks, times, reason } = req.body;

    if (
      !daysOfWeek ||
      !Array.isArray(daysOfWeek) ||
      daysOfWeek.length === 0 ||
      !numberOfWeeks ||
      !times ||
      !Array.isArray(times) ||
      times.length === 0
    ) {
      throw new AppError('Days of week, number of weeks, and times are required', 400);
    }

    const result = await blockedSlotsService.blockRecurringTimeSlots(daysOfWeek, numberOfWeeks, times, reason || 'Recurring block');

    return sendSuccessResponse(res, result);
  }

  /**
   * Unblock time slots
   */
  async unblockTimeSlots(req: Request, res: Response) {
    const { date, times } = req.body;

    if (!date || !times || !Array.isArray(times) || times.length === 0) {
      throw new AppError('Date and times array are required', 400);
    }

    const result = await blockedSlotsService.unblockTimeSlots(new Date(date), times);
    return sendSuccessResponse(res, result);
  }
}
