import { Request, Response, NextFunction } from 'express';

interface CacheItem {
  data: any;
  expiresAt: number;
}

interface CacheOptions {
  duration: number; // Cache duration in seconds
  cacheKey?: (req: Request) => string; // Optional function to generate a custom cache key
}

const cache = new Map<string, CacheItem>();

/**
 * Middleware for caching API responses
 * @param options Caching options
 */
export function cacheMiddleware(options: CacheOptions) {
  const { duration = 60 } = options; // Default 60 seconds

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key based on URL or custom function
    const key = options.cacheKey ? options.cacheKey(req) : `${req.originalUrl || req.url}`;

    // Check if we have a cached response
    const cachedItem = cache.get(key);

    if (cachedItem && cachedItem.expiresAt > Date.now()) {
      // Cache hit - return cached response
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedItem.data);
    }

    // Cache miss - store original json method
    const originalJson = res.json;

    // Override json method to cache the response
    res.json = function (body) {
      // Store in cache before sending
      cache.set(key, {
        data: body,
        expiresAt: Date.now() + duration * 1000
      });

      // Set cache header
      res.setHeader('X-Cache', 'MISS');

      // Call original json method
      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Invalidate cache entry by key pattern
 * @param keyPattern Exact key or pattern to match
 */
export function invalidateCache(keyPattern: string | RegExp) {
  if (typeof keyPattern === 'string') {
    // Delete exact key match
    cache.delete(keyPattern);
  } else {
    // Delete keys matching pattern
    for (const key of cache.keys()) {
      if (keyPattern.test(key)) {
        cache.delete(key);
      }
    }
  }
}

/**
 * Clear the entire cache
 */
export function clearCache() {
  cache.clear();
}
