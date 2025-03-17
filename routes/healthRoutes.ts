import { Router } from 'express';
import { db } from '../db/index';

const router = Router();

// Simple health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Test database connection (optional)
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

export default router;
