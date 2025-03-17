import { Request, Response } from 'express';
import { BookingService } from '../services/bookingService';
import { AppError, sendSuccessResponse, sendErrorResponse } from '../utils/errorHandler';

const bookingService = new BookingService();

/**
 * Controller for booking-related endpoints
 */
export class BookingController {
  /**
   * Get availability for a specific date
   */
  async getAvailability(req: Request, res: Response) {
    try {
      const { date } = req.query;

      if (!date) {
        throw new AppError('Date is required', 400);
      }

      const availability = await bookingService.getAvailability(new Date(date as string));
      return sendSuccessResponse(res, availability);
    } catch (error) {
      if (error instanceof AppError) {
        return sendErrorResponse(res, error.status, error.message, error.details);
      }
      return sendErrorResponse(res, 500, error.message || 'Error checking availability');
    }
  }

  /**
   * Get the next available date
   */
  async getNextAvailableDate(req: Request, res: Response) {
    try {
      const result = await bookingService.getNextAvailableDate();
      return sendSuccessResponse(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        return sendErrorResponse(res, error.status, error.message, error.details);
      }
      return sendErrorResponse(res, 500, error.message || 'Error finding next available date');
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(req: Request, res: Response) {
    try {
      const { name, email, company, message, date, time } = req.body;

      // Validate required fields
      if (!name || !email || !company || !date || !time) {
        throw new AppError('Required fields are missing', 400);
      }

      const newBooking = await bookingService.createBooking({
        name,
        email,
        company,
        message,
        date: new Date(date),
        time
      });

      return sendSuccessResponse(
        res,
        {
          message: 'Consultation booked successfully. Please check your email to confirm the booking.',
          booking: newBooking
        },
        201
      );
    } catch (error) {
      // Make sure error is always handled as JSON with the full message
      if (error instanceof AppError) {
        console.log(`Sending error response: ${error.status} - ${error.message}`);
        return sendErrorResponse(res, error.status, error.message, error.details);
      } else {
        console.log(`Sending generic error: ${error.message || 'Failed to create booking'}`);
        return sendErrorResponse(res, 500, error.message || 'Failed to create booking');
      }
    }
  }

  /**
   * Get booking by token
   */
  async getBookingByToken(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const booking = await bookingService.getBookingByToken(token);
      return sendSuccessResponse(res, booking);
    } catch (error) {
      if (error instanceof AppError) {
        return sendErrorResponse(res, error.status, error.message, error.details);
      }
      return sendErrorResponse(res, 500, error.message || 'Error retrieving booking');
    }
  }

  /**
   * Confirm a booking
   */
  async confirmBooking(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const result = await bookingService.confirmBooking(token);

      // Handle redirect for HTML requests
      const acceptHeader = req.get('accept');
      if (acceptHeader && acceptHeader.includes('text/html')) {
        return res.redirect('/booking/success?token=' + token);
      }

      return sendSuccessResponse(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        return sendErrorResponse(res, error.status, error.message, error.details);
      }
      return sendErrorResponse(res, 500, error.message || 'Error confirming booking');
    }
  }

  /**
   * Update booking date and time
   */
  async updateBooking(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { date, time } = req.body;

      if (!date || !time) {
        throw new AppError('Date and time are required', 400);
      }

      const result = await bookingService.updateBooking(token, new Date(date), time);
      return sendSuccessResponse(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        return sendErrorResponse(res, error.status, error.message, error.details);
      }
      return sendErrorResponse(res, 500, error.message || 'Error updating booking');
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const result = await bookingService.cancelBooking(token);
      return sendSuccessResponse(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        return sendErrorResponse(res, error.status, error.message, error.details);
      }
      return sendErrorResponse(res, 500, error.message || 'Error cancelling booking');
    }
  }

  /**
   * Get upcoming consultations (admin only)
   */
  async getUpcomingConsultations(req: Request, res: Response) {
    try {
      const consultations = await bookingService.getUpcomingConsultations();
      return sendSuccessResponse(res, consultations);
    } catch (error) {
      if (error instanceof AppError) {
        return sendErrorResponse(res, error.status, error.message, error.details);
      }
      return sendErrorResponse(res, 500, error.message || 'Error retrieving consultations');
    }
  }

  /**
   * Cancel a consultation by ID (admin only)
   */
  async cancelConsultationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await bookingService.cancelConsultationById(parseInt(id, 10));
      return sendSuccessResponse(res, result);
    } catch (error) {
      if (error instanceof AppError) {
        return sendErrorResponse(res, error.status, error.message, error.details);
      }
      return sendErrorResponse(res, 500, error.message || 'Error cancelling consultation');
    }
  }
}
