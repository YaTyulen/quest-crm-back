import { Router } from 'express';
import { setupController } from '../controllers/setup.controller';
import { validateBody } from '../middleware/validate';
import { setupSchema } from '../schemas/auth.schema';

const router = Router();

router.get('/status', setupController.getStatus);
router.post('/', validateBody(setupSchema), setupController.createFirstAdmin);

export default router;