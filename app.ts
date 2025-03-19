import express, { type Express, Request, Response, NextFunction } from 'express';
import compression from 'compression';
import fileUpload from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { errorHandler, notFoundHandler } from './utils/errorHandler';
import apiRoutes from './routes/api';
import { setupAuth } from './auth';
import { corsMiddleware } from './middlewares/cors';

/**
 * Create and configure the Express application
 */
export function createApp(): Express {
  const app = express();

  // Enable compression - should be one of the first middlewares
  app.use(
    compression({
      // Only compress responses larger than 1KB
      threshold: 1024,
      // Don't compress responses with this content type
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Use compression by default
        return compression.filter(req, res);
      },
      // Compression level (0-9): higher = better compression but slower
      level: 6
    })
  );

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Use the CORS middleware
  app.use(corsMiddleware);

  // Request logging middleware - optimized version
  app.use((req, res, next) => {
    // Only log API requests
    if (!req.path.startsWith('/api')) {
      return next();
    }

    const start = Date.now();

    // Optimize response capture by not storing large response bodies
    let statusCode: number;

    const originalEnd = res.end;
    res.end = function (chunk?, encoding?) {
      statusCode = res.statusCode;

      const duration = Date.now() - start;
      let logLine = `${req.method} ${req.path} ${statusCode} in ${duration}ms`;

      // Keep log line short to save memory
      console.log(logLine);

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  });

  // Setup file upload middleware
  app.use(
    fileUpload({
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
      createParentPath: true
    })
  );

  // Setup uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadsDir));

  // Setup authentication
  setupAuth(app);

  // Mount API routes
  app.use(apiRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
