import { Router } from 'express';
import { slotController } from '../controllers/slot.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateBody } from '../middleware/validate';
import { createSlotSchema, updateSlotSchema } from '../schemas/slot.schema';

const router = Router();

router.use(authenticate);

// Чтение — любой авторизованный
router.get('/', slotController.getAllSlots);
router.get('/:id', slotController.getSlotById);

// Изменения — только админ
router.post('/', requireAdmin, validateBody(createSlotSchema), slotController.createSlot);
router.put('/:id', requireAdmin, validateBody(updateSlotSchema), slotController.updateSlot);
router.delete('/:id', requireAdmin, slotController.deleteSlot);

export default router;