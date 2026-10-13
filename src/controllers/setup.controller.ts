import { Request, Response } from 'express';
import { setupService } from '../services/setup.service';
import { asyncHandler } from '../utils/asyncHandler';

export const setupController = {
  getStatus: asyncHandler(async (_req: Request, res: Response) => {
    const required = await setupService.isSetupRequired();
    res.status(200).json({ setupRequired: required });
  }),

  createFirstAdmin: asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    const result = await setupService.createFirstAdmin({ name, email, password });
    res.status(201).json(result);
  }),
};