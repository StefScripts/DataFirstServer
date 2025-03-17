import { Request, Response } from 'express';
import path from 'path';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { UploadedFile } from 'express-fileupload';

/**
 * Controller for file uploads
 */
export class UploadController {
  /**
   * Upload an image file
   */
  async uploadImage(req: Request, res: Response) {
    if (!req.files || Object.keys(req.files).length === 0) {
      throw new AppError('No files were uploaded.', 400);
    }

    const file = req.files.image as UploadedFile;
    if (!file) {
      throw new AppError('Image file is required.', 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new AppError('Invalid file type. Only JPEG, PNG, GIF and WEBP are allowed.', 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const filename = `${timestamp}${ext}`;
    const uploadPath = path.join(process.cwd(), 'uploads', filename);

    // Move file to upload directory
    await file.mv(uploadPath);

    // Return the URL for the uploaded file
    const fileUrl = `/uploads/${filename}`;
    return sendSuccessResponse(res, {
      url: fileUrl,
      message: 'File uploaded successfully'
    });
  }
}
