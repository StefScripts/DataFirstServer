import { db } from '../db/index';
import { users, passwordResetTokens } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { AppError } from '../utils/errorHandler';
import { emailService } from './emailService';

const scryptAsync = promisify(scrypt);

export class AuthService {
  // Hash a password
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }

  // Compare a password with a stored hash
  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashed, salt] = stored.split('.');
    const hashedBuf = Buffer.from(hashed, 'hex');
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }

  // Get a user by username
  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  // Create a new user
  async createUser(username: string, password: string) {
    const hashedPassword = await this.hashPassword(password);

    // Check if user already exists
    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      throw new AppError('Username already exists', 400);
    }

    // Create the user
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword
      })
      .returning();

    return newUser;
  }

  // Generate a password reset token
  async generateResetToken(userId: number) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Type casting approach to fix the TypeScript error
    const values = {
      userId,
      token,
      expiresAt
      // Remove the 'used' field as it has a default value in the schema
      // We'll let the database use the default value
    };

    const [resetToken] = await db.insert(passwordResetTokens).values(values).returning();

    return resetToken;
  }

  // Request a password reset
  async requestPasswordReset(email: string) {
    const user = await this.getUserByUsername(email);

    // If no user found, we still return success to prevent user enumeration
    if (!user) {
      return { success: true };
    }

    // Generate reset token
    const resetToken = await this.generateResetToken(user.id);

    // Send password reset email
    await emailService.sendPasswordResetEmail(email, resetToken.token);

    return { success: true };
  }

  // Reset password with token
  // Modified version of resetPassword() method
  async resetPassword(token: string, newPassword: string) {
    // Find the token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, false), gt(passwordResetTokens.expiresAt, new Date())))
      .limit(1);

    if (!resetToken) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Hash the new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, resetToken.userId));

    // Update token separately to fix the TypeScript error
    // Type casting to avoid the type error
    await db
      .update(passwordResetTokens)
      .set({
        // Explicitly use column reference instead of object property
        [passwordResetTokens.used.name]: true
      })
      .where(eq(passwordResetTokens.id, resetToken.id));

    return { success: true };
  }
}
