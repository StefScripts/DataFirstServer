import { Router } from 'express';
import { BlockedSlotsController } from '../controllers/blockedSlotsController';
import { asyncHandler } from '../utils/errorHandler';
import { requireAuth } from '../middlewares/auth';

const router = Router();
const blockedSlotsController = new BlockedSlotsController();

// All blocked slots routes require authentication
router.use(requireAuth);

// Routes
router.get('/blocked-slots', asyncHandler(blockedSlotsController.getSlotsByDate));
router.post('/blocked-slots', asyncHandler(blockedSlotsController.blockTimeSlot));
router.post('/blocked-slots/bulk', asyncHandler(blockedSlotsController.blockBulkTimeSlots));
router.post('/blocked-slots/recurring', asyncHandler(blockedSlotsController.blockRecurringTimeSlots));
router.delete('/blocked-slots', asyncHandler(blockedSlotsController.unblockTimeSlots));

export default router;
