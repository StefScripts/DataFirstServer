import { Router } from 'express';
import { BookingController } from '../controllers/bookingController';
import { asyncHandler } from '../utils/errorHandler';
import { requireAuth } from '../middlewares/auth';
import { enhancedCacheMiddleware } from '../middlewares/enhanced-cache';

const router = Router();
const bookingController = new BookingController();

// Public routes
router.get(
  '/availability',
  enhancedCacheMiddleware({
    duration: 3600 // 1 hour in seconds
  }),
  asyncHandler(bookingController.getAvailability)
);
router.get(
  '/availability/next',
  enhancedCacheMiddleware({
    duration: 7200 // 2 hours in seconds
  }),
  asyncHandler(bookingController.getNextAvailableDate)
);
router.get(
  '/availability/combined',
  enhancedCacheMiddleware({
    duration: 3600 // 1 hour
  }),
  asyncHandler(bookingController.getNextAvailableWithSlots)
);
router.post(
  '/bookings',
  enhancedCacheMiddleware({
    duration: 3600 // 1 hour in seconds
  }),
  asyncHandler(bookingController.createBooking)
);
router.get('/bookings/:token', asyncHandler(bookingController.getBookingByToken));
router.get('/bookings/confirm/:token', asyncHandler(bookingController.confirmBooking));
router.put('/bookings/:token', asyncHandler(bookingController.updateBooking));
router.delete('/bookings/:token', asyncHandler(bookingController.cancelBooking));

// Admin routes
router.get('/admin/consultations', requireAuth, asyncHandler(bookingController.getUpcomingConsultations));
router.delete('/admin/consultations/:id', requireAuth, asyncHandler(bookingController.cancelConsultationById));

export default router;
