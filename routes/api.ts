import { Router } from 'express';
import bookingRoutes from './bookingRoutes';
import blockedSlotsRoutes from './blockedSlotsRoutes';
import authRoutes from './authRoutes';
import contactRoutes from './contactRoutes';
import uploadRoutes from './uploadRoutes';
import healthRoutes from './healthRoutes';

const router = Router();

// Mount health check routes
router.use('/api', healthRoutes);

// Mount other routes
router.use('/api', bookingRoutes);
router.use('/api/admin', blockedSlotsRoutes);
router.use('/api', authRoutes);
router.use('/api', contactRoutes);
router.use('/api', uploadRoutes);

export default router;
