import { Request, Response, NextFunction } from 'express';

/**
 * Error response interface
 */
export interface ErrorResponse {
  message: string;
  details?: string | Record<string, any>;
  status?: number;
}

/**
 * Custom error class that includes HTTP status code
 */
export class AppError extends Error {
  status: number;
  details?: string | Record<string, any>;

  constructor(message: string, status = 500, details?: string | Record<string, any>) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async function handler to catch errors in async route handlers
 * @param fn Async express route handler
 * @returns Express route handler with error catching
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error | AppError, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  // Set defaults
  let statusCode = 500;
  let errorMessage = 'Internal Server Error';
  let details: any = undefined;

  // Handle specific error types
  if (err instanceof AppError) {
    statusCode = err.status;
    errorMessage = err.message;
    details = err.details;
  } else {
    errorMessage = err.message || errorMessage;
  }

  // Check if headers have already been sent
  if (res.headersSent) {
    return _next(err);
  }

  // IMPORTANT: Always return JSON for API routes
  if (req.path.startsWith('/api/')) {
    const errorResponse: ErrorResponse = {
      message: errorMessage
    };

    if (details) {
      errorResponse.details = details;
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(statusCode).json(errorResponse);
  }

  // For non-API routes (HTML requests)
  // In production, show a generic error page
  // In development, show detailed error
  if (process.env.NODE_ENV === 'production') {
    return res.status(statusCode).send(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>${statusCode}: ${errorMessage}</h1>
          <p>Please try again later or contact support.</p>
        </body>
      </html>
    `);
  } else {
    return res.status(statusCode).send(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>${statusCode}: ${errorMessage}</h1>
          <pre>${err.stack}</pre>
          ${details ? `<h2>Details:</h2><pre>${JSON.stringify(details, null, 2)}</pre>` : ''}
        </body>
      </html>
    `);
  }
};

/**
 * Creates a 404 error handler for routes that don't exist
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  // For API routes, always return JSON
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(404).json({
      message: `Not Found - ${req.originalUrl}`
    });
  }

  const err = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(err);
};

/**
 * Helper to create standard error responses
 */
export const sendErrorResponse = (res: Response, status: number, message: string, details?: any) => {
  // Log the error being sent to help with debugging
  console.log(`Sending error response: status=${status}, message="${message}"`);

  // Always set content type to ensure proper handling
  res.setHeader('Content-Type', 'application/json');

  // Send the full message in the response
  return res.status(status).json({
    message,
    ...(details && { details }),
    status
  });
};

/**
 * Helper to create standard success responses
 */
export const sendSuccessResponse = (res: Response, data: any, status = 200) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(data);
};
