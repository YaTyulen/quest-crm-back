import { Request, Response } from 'express';
import { slotService } from '../services/slot.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { NotFoundError } from '../errors/HttpError';

export const slotController = {
  getAllSlots: asyncHandler(async (_req: Request, res: Response) => {
    const slots = await slotService.getAllSlots();
    res.status(200).json(slots);
  }),

  getSlotById: asyncHandler(async (req: Request, res: Response) => {
    const id = parseId(req.params.id, 'slot');
    const slot = await slotService.getSlotById(id);
    if (!slot) throw new NotFoundError('Slot not found');
    res.status(200).json(slot);
  }),

  createSlot: asyncHandler(async (req: Request, res: Response) => {
    const slot = await slotService.createSlot(req.body);
    res.status(201).json(slot);
  }),

  updateSlot: asyncHandler(async (req: Request, res: Response) => {
    const id = parseId(req.params.id, 'slot');
    const slot = await slotService.updateSlot(id, req.body);
    res.status(200).json(slot);
  }),

  deleteSlot: asyncHandler(async (req: Request, res: Response) => {
    const id = parseId(req.params.id, 'slot');
    const slot = await slotService.deleteSlot(id);
    res.status(200).json({ message: 'Slot deleted', slot });
  }),
};