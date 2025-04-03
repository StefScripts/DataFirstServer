import { Router } from 'express';
import { db } from '../db/index';
import { testConnection } from '../db/index';
import { BookingService } from '../services/bookingService';
import { BlockedSlotsService } from '../services/blockedSlotsService';

const router = Router();
const bookingService = new BookingService();
const blockedSlotsService = new BlockedSlotsService();

// Simple health check
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.execute('SELECT 1');

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Comprehensive warm-up endpoint
router.get('/warmup', async (req, res) => {
  const startTime = Date.now();
  const results = {
    database: false,
    services: {
      booking: false,
      blockedSlots: false,
      blog: false
    },
    duration: 0
  };

  try {
    // 1. Test database connection
    results.database = await testConnection();

    // 2. Warm up booking service
    try {
      const today = new Date();
      await bookingService.getAvailability(today);
      results.services.booking = true;
    } catch (error) {
      console.error('Booking service warm-up failed:', error);
    }

    // 3. Warm up blocked slots service
    try {
      const today = new Date();
      await blockedSlotsService.getSlotsByDate(today);
      results.services.blockedSlots = true;
    } catch (error) {
      console.error('Blocked slots service warm-up failed:', error);
    }

    // Calculate total duration
    results.duration = Date.now() - startTime;

    res.status(200).json({
      status: 'ok',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Warm-up failed:', error);
    results.duration = Date.now() - startTime;

    res.status(500).json({
      status: 'error',
      message: 'Warm-up failed',
      results,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
