import express, { type Express, Request, Response, NextFunction } from 'express';
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

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Use the CORS middleware
  app.use(corsMiddleware);

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (path.startsWith('/api')) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + '…';
        }

        console.log(logLine);
      }
    });

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
