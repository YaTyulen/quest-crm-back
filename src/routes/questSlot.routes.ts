import { Router } from 'express';
import { questSlotController } from '../controllers/questSlot.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateBody } from '../middleware/validate';
import { updateQuestSlotsSchema } from '../schemas/questSlot.schema';

// mergeParams: true — чтобы получить :questId из родительского роутера
const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', questSlotController.getQuestSlots);
router.put('/', requireAdmin, validateBody(updateQuestSlotsSchema), questSlotController.replaceQuestSlots);

export default router;