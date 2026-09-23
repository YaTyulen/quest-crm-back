// связывает http-метод и путь с конкретным методом контроллера

import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { questController } from '../controllers/quest.controller';

const router = Router();

router.get('/', authenticate, questController.getAllQuests);
router.get('/:id', authenticate, questController.getQuestById);
router.post('/', authenticate, requireAdmin, questController.createQuest);
router.put('/:id', authenticate, requireAdmin, questController.updateQuest);
router.delete('/:id', authenticate, requireAdmin, questController.deleteQuest);


export default router;