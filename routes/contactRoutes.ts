import { Router } from 'express';
import { ContactController } from '../controllers/contactController';
import { asyncHandler } from '../utils/errorHandler';

const router = Router();
const contactController = new ContactController();

// Routes
router.post('/contact', asyncHandler(contactController.submitContactForm));

export default router;
