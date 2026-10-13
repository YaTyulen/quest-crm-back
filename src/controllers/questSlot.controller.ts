import { Request, Response } from 'express';
import { questSlotService } from '../services/questSlot.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';

export const questSlotController = {
  getQuestSlots: asyncHandler(async (req: Request, res: Response) => {
    const questId = parseId(req.params.questId, 'quest');
    const result = await questSlotService.getQuestSlots(questId);
    res.status(200).json(result);
  }),

  replaceQuestSlots: asyncHandler(async (req: Request, res: Response) => {
    const questId = parseId(req.params.questId, 'quest');
    const { slotIds } = req.body;
    const result = await questSlotService.replaceQuestSlots(questId, slotIds);
    res.status(200).json(result);
  }),
};