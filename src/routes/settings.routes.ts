import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateBody } from '../middleware/validate';
import { updateSettingsSchema } from '../schemas/settings.schema';

const router = Router();

router.use(authenticate);

router.get('/', settingsController.getSettings);
router.put('/', requireAdmin, validateBody(updateSettingsSchema), settingsController.updateSettings);

export default router;