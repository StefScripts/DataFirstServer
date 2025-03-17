import { Request, Response, NextFunction } from 'express';

/**
 * CORS middleware for allowing requests from the frontend
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://datafirstseo.com', 'https://datafirstseo.vercel.app'];

  // Add localhost for development
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
  }

  const origin = req.headers.origin;

  // Check if the request origin is in our allowed origins
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    // Allow credentials (cookies)
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    // For non-browser requests or unknown origins
    res.header('Access-Control-Allow-Origin', '*');
  }

  // Set other CORS headers
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}
