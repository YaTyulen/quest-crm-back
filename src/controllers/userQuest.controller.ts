import { Request, Response } from 'express';
import { userQuestService } from '../services/userQuest.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';

export const userQuestController = {
  getUserQuests: asyncHandler(async (req: Request, res: Response) => {
    const userId = parseId(req.params.userId, 'user');
    const result = await userQuestService.getUserQuests(userId);
    res.status(200).json(result);
  }),

  replaceUserQuests: asyncHandler(async (req: Request, res: Response) => {
    const userId = parseId(req.params.userId, 'user');
    const { questIds } = req.body;
    const result = await userQuestService.replaceUserQuests(userId, questIds);
    res.status(200).json(result);
  }),
};