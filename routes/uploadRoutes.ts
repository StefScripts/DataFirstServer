import { Router } from 'express';
import { UploadController } from '../controllers/uploadController';
import { asyncHandler } from '../utils/errorHandler';
import { requireAuth } from '../middlewares/auth';

const router = Router();
const uploadController = new UploadController();

// All upload routes require authentication
router.use(requireAuth);

// Routes
router.post('/upload', asyncHandler(uploadController.uploadImage));

export default router;
