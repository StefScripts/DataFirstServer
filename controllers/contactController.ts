import { Request, Response } from 'express';
import { emailService } from '../services/emailService';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';

/**
 * Controller for contact form
 */
export class ContactController {
  /**
   * Process contact form submission
   */
  async submitContactForm(req: Request, res: Response) {
    const { name, email, company, message } = req.body;

    // Validate required fields
    if (!name || !email || !company || !message) {
      throw new AppError('All fields are required', 400);
    }

    // Send email notification
    await emailService.sendContactFormMessage({
      name,
      email,
      company,
      message
    });

    return sendSuccessResponse(res, { message: 'Message received successfully' });
  }
}
