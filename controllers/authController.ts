import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { AuthService } from '../services/authService';

const authService = new AuthService();

/**
 * Controller for authentication endpoints
 */
export class AuthController {
  /**
   * Login with username and password
   */
  async login(req: Request, res: Response, next: NextFunction) {
    passport.authenticate('local', (err: Error, user: Express.User) => {
      if (err) return next(err);
      if (!user) {
        return next(new AppError('Invalid credentials', 401));
      }

      req.login(user, (err) => {
        if (err) return next(err);
        return sendSuccessResponse(res, user);
      });
    })(req, res, next);
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response) {
    req.logout((err) => {
      if (err) throw new AppError('Error logging out', 500);
      return sendSuccessResponse(res, { message: 'Successfully logged out' });
    });
  }

  /**
   * Get current user
   */
  async getCurrentUser(req: Request, res: Response) {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    return sendSuccessResponse(res, req.user);
  }

  /**
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    await authService.requestPasswordReset(email);

    // Always return success to prevent user enumeration
    return sendSuccessResponse(res, {
      message: 'If an account exists with that email, you will receive a password reset link.'
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400);
    }

    await authService.resetPassword(token, newPassword);

    return sendSuccessResponse(res, { message: 'Password updated successfully' });
  }
}
