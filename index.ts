// import { createServer } from 'http';
// import { createApp } from './app';
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// (async () => {
//   console.log('Starting server...');

//   // Create Express app
//   const app = createApp();

//   // Create HTTP server
//   const server = createServer(app);

//   // Determine if we should try to set up Vite
//   const isDevelopment = process.env.NODE_ENV !== 'production';

//   if (isDevelopment) {
//     try {
//       // Try to dynamically import Vite setup
//       const viteSetupPath = path.join(__dirname, 'vite.ts');
//       if (fs.existsSync(viteSetupPath)) {
//         const { setupVite } = await import('./vite.js');
//         console.log('Setting up Vite development server...');
//         await setupVite(app, server);
//       } else {
//         console.log('Vite setup file not found, using static file serving');
//         setupStaticFileServing(app);
//       }
//     } catch (error) {
//       console.error('Failed to set up Vite:', error);
//       setupStaticFileServing(app);
//     }
//   } else {
//     console.log('Running in production mode, setting up static file serving');
//     setupStaticFileServing(app);
//   }

//   // Start server
//   const port = Number(process.env.PORT) || 5000;
//   server.listen(port, '0.0.0.0', () => {
//     console.log(`Server is running on http://0.0.0.0:${port}`);
//     console.log(`serving on port ${port}`);
//   });
// })().catch((err) => {
//   console.error('Failed to start server:', err);
//   process.exit(1);
// });

// function setupStaticFileServing(app) {
//   // Simple handler for frontend routes
//   app.get('*', (req, res, next) => {
//     // Skip API routes
//     if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
//       return next();
//     }

//     // Try to serve the client index.html
//     const clientIndexPath = path.resolve(__dirname, '..', 'client', 'index.html');
//     if (fs.existsSync(clientIndexPath)) {
//       res.sendFile(clientIndexPath);
//     } else {
//       // If index.html doesn't exist, serve a placeholder
//       res.status(200).send(`
//         <html>
//           <head><title>Frontend Not Available</title></head>
//           <body>
//             <h1>Frontend Not Available</h1>
//             <p>The frontend code is not built or not found.</p>
//             <p>API endpoints are available at /api/...</p>
//           </body>
//         </html>
//       `);
//     }
//   });
// }

import { createServer } from 'http';
import { createApp } from './app';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  console.log('Starting server...');

  // Create Express app
  const app = createApp();

  // Create HTTP server
  const server = createServer(app);

  // Determine if we should try to set up Vite
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    try {
      // Try to dynamically import Vite setup
      const viteSetupPath = path.join(__dirname, 'vite.ts');
      if (fs.existsSync(viteSetupPath)) {
        const { setupVite } = await import('./vite.js');
        console.log('Setting up Vite development server...');
        await setupVite(app, server);
      } else {
        console.log('Vite setup file not found, using static file serving');
        setupStaticFileServing(app);
      }
    } catch (error) {
      console.error('Failed to set up Vite:', error);
      setupStaticFileServing(app);
    }
  } else {
    console.log('Running in production mode, setting up static file serving');
    setupStaticFileServing(app);
  }

  // Start server
  const port = Number(process.env.PORT) || 5000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
    console.log(`serving on port ${port}`);
  });
})().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

function setupStaticFileServing(app) {
  // Simple handler for frontend routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }

    // Try to serve index.html from server's public directory
    const indexPath = path.resolve(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // If index.html doesn't exist, serve a placeholder
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
    }
  });
}
