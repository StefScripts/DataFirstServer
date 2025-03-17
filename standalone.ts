import { createServer } from 'http';
import express from 'express';
import { db } from './db/index';
import { setupAuth } from './auth';
import apiRoutes from './routes/api';
import { errorHandler, notFoundHandler } from './utils/errorHandler';
import fileUpload from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { corsMiddleware } from './middlewares/cors';

// Basic Express app setup without Vite integration
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply CORS middleware
app.use(corsMiddleware);

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

// Simple message for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.status(200).send(`
    <html>
      <head>
        <title>API Server</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f1f1f1; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Server Running in API-only Mode</h1>
        <p>The API server is running correctly. The frontend application is deployed at:</p>
        <ul>
          <li><a href="https://datafirstseo.com" target="_blank">datafirstseo.com</a></li>
          <li><a href="https://datafirstseo.vercel.app" target="_blank">datafirstseo.vercel.app</a></li>
        </ul>
        
        <h2>Available API Endpoints:</h2>
        <pre>
GET  /api/availability - Check time slot availability
GET  /api/availability/next - Get next available date
POST /api/bookings - Create a booking
GET  /api/bookings/:token - Get booking by token
PUT  /api/bookings/:token - Update a booking
etc.
        </pre>
      </body>
    </html>
  `);
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const port = Number(process.env.PORT) || 5000;
const server = createServer(app);

server.listen(port, '0.0.0.0', () => {
  console.log(`API Server is running on http://0.0.0.0:${port}`);
});

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
