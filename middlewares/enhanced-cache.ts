import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';

// Create a cache instance with 30 minute TTL by default
const cache = new NodeCache({
  stdTTL: 1800, // 30 minutes in seconds
  checkperiod: 120, // Check for expired entries every 2 minutes
  useClones: false // Store objects by reference for better performance
});

interface CacheOptions {
  duration?: number; // Cache duration in seconds
  key?: string | ((req: Request) => string); // Custom cache key
}

export function enhancedCacheMiddleware(options: CacheOptions = {}) {
  const { duration } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = typeof options.key === 'function' ? options.key(req) : options.key || `${req.originalUrl || req.url}`;

    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    // Override res.json to store response in cache
    const originalJson = res.json;
    res.json = function (body) {
      // Set custom TTL if provided
      const ttl = duration || 1800;

      // Store in cache
      cache.set(cacheKey, body, ttl);

      // Set cache header
      res.setHeader('X-Cache', 'MISS');

      // Call original json method
      return originalJson.call(this, body);
    };

    next();
  };
}

// Helper to invalidate specific cache entries
export function invalidateCache(keyPattern: string | RegExp) {
  const keys = cache.keys();

  if (typeof keyPattern === 'string') {
    // Delete exact match
    cache.del(keyPattern);
  } else {
    // Delete by pattern
    for (const key of keys) {
      if (keyPattern.test(key)) {
        cache.del(key);
      }
    }
  }
}

// Add this to warm up the cache on server start
export async function warmUpCache(bookingService: any) {
  try {
    // Pre-warm the next available date
    const nextAvailable = await bookingService.getNextAvailableDate();
    if (nextAvailable?.nextAvailableDate) {
      const date = new Date(nextAvailable.nextAvailableDate);
      // Also pre-warm the availability for this date
      await bookingService.getAvailability(date);
    }
  } catch (error) {
    console.error('Failed to warm up cache:', error);
  }
}
