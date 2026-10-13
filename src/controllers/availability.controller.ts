import { Response } from 'express';
import { availabilityService } from '../services/availability.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middleware/authenticate';

interface ValidatedRequest extends AuthRequest {
  validatedQuery?: {
    questId: number;
    from: string;
    to: string;
  };
}

export const availabilityController = {
  getMyAvailability: asyncHandler(async (req: ValidatedRequest, res: Response) => {
    const userId = req.userId!;
    const { questId, from, to } = req.validatedQuery!;

    const result = await availabilityService.getMyAvailability(userId, questId, from, to);
    res.status(200).json(result);
  }),

  saveMyAvailability: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const result = await availabilityService.saveMyAvailability(userId, req.body);
    res.status(200).json(result);
  }),
};