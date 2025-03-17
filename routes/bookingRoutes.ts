import { Router } from 'express';
import { BookingController } from '../controllers/bookingController';
import { asyncHandler } from '../utils/errorHandler';
import { requireAuth } from '../middlewares/auth';

const router = Router();
const bookingController = new BookingController();

// Public routes
router.get('/availability', asyncHandler(bookingController.getAvailability));
router.get('/availability/next', asyncHandler(bookingController.getNextAvailableDate));
router.post('/bookings', asyncHandler(bookingController.createBooking));
router.get('/bookings/:token', asyncHandler(bookingController.getBookingByToken));
router.get('/bookings/confirm/:token', asyncHandler(bookingController.confirmBooking));
router.put('/bookings/:token', asyncHandler(bookingController.updateBooking));
router.delete('/bookings/:token', asyncHandler(bookingController.cancelBooking));

// Admin routes
router.get('/admin/consultations', requireAuth, asyncHandler(bookingController.getUpcomingConsultations));
router.delete('/admin/consultations/:id', requireAuth, asyncHandler(bookingController.cancelConsultationById));

export default router;
