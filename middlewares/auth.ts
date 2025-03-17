import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errorHandler';

/**
 * Middleware to check if user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw new AppError('Unauthorized', 401);
  }
  next();
}

/**
 * Middleware to check if user is an admin
 * Note: This could be extended with role checking
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw new AppError('Unauthorized', 401);
  }

  // Could be extended with role checks
  // if (!req.user.isAdmin) {
  //   throw new AppError('Forbidden', 403);
  // }

  next();
}
