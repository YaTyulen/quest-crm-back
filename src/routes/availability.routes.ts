import { Router } from 'express';
import { availabilityController } from '../controllers/availability.controller';
import { authenticate } from '../middleware/authenticate';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  getMyAvailabilityQuerySchema,
  saveMyAvailabilitySchema,
} from '../schemas/availability.schema';

const router = Router();

router.use(authenticate);

router.get('/me', validateQuery(getMyAvailabilityQuerySchema), availabilityController.getMyAvailability);
router.put('/me', validateBody(saveMyAvailabilitySchema), availabilityController.saveMyAvailability);

export default router;