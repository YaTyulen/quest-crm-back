import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { asyncHandler } from '../utils/asyncHandler';

export const settingsController = {
  getSettings: asyncHandler(async (_req: Request, res: Response) => {
    const settings = await settingsService.getSettings();
    res.status(200).json(settings);
  }),

  updateSettings: asyncHandler(async (req: Request, res: Response) => {
    const settings = await settingsService.updateSettings(req.body);
    res.status(200).json(settings);
  }),
};