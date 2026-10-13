import { Router } from 'express';
import { userQuestController } from '../controllers/userQuest.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateBody } from '../middleware/validate';
import { updateUserQuestsSchema } from '../schemas/userQuest.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', userQuestController.getUserQuests);
router.put('/', requireAdmin, validateBody(updateUserQuestsSchema), userQuestController.replaceUserQuests);

export default router;