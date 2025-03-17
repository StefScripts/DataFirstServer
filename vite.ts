import express, { type Express } from 'express';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { type Server } from 'http';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  try {
    // Instead of using dynamic imports that create circular references,
    // we'll check if the files exist and use a simpler approach

    // Updated path to look for static files in server's public directory
    const publicPath = path.resolve(__dirname, 'public');
    if (fs.existsSync(publicPath)) {
      console.log('Serving static files from:', publicPath);
      app.use(express.static(publicPath));

      // Serve index.html for all non-API routes
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
          return next();
        }
        res.sendFile(path.resolve(publicPath, 'index.html'));
      });
    } else {
      console.log('No static files to serve. API-only mode.');

      // Handle non-API routes if no static files
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
              <h1>API Server Running</h1>
              <p>The server is running in API-only mode.</p>
              <p>API endpoints are available at /api/...</p>
            </body>
          </html>
        `);
      });
    }
  } catch (error) {
    console.error('Failed to set up static file serving:', error);
    serveStatic(app);
  }
}

export function serveStatic(app: Express) {
  try {
    // Updated path to look for static files in server's public directory
    const publicPath = path.resolve(__dirname, 'public');
    if (fs.existsSync(publicPath)) {
      console.log('Serving static files from:', publicPath);
      app.use(express.static(publicPath));

      // Serve index.html for all non-API routes
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
          return next();
        }
        res.sendFile(path.resolve(publicPath, 'index.html'));
      });
    } else {
      console.log('No static files to serve. API-only mode.');

      // Handle non-API routes if no static files
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
              <h1>API Server Running</h1>
              <p>The server is running in API-only mode.</p>
              <p>API endpoints are available at /api/...</p>
            </body>
          </html>
        `);
      });
    }
  } catch (error) {
    console.error('Error setting up static file serving:', error);
  }
}
