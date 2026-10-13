import { Request, Response } from 'express';
import { questService } from '../services/quest.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { BadRequestError, NotFoundError } from '../errors/HttpError';

export const questController = {
    getAllQuests: asyncHandler(async (_req: Request, res: Response) => {
        const quests = await questService.getAllQuests();
        res.status(200).json(quests);
    }),

    getQuestById: asyncHandler(async (req: Request, res: Response) => {
        const id = parseId(req.params.id, 'quest');
        const quest = await questService.getQuestById(id);
    
        if (!quest) {
            throw new NotFoundError('Quest not found');
        }
    
        res.status(200).json(quest);
    }),

    createQuest: asyncHandler(async (req: Request, res: Response) => {
        const { title, description } = req.body;
    
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
          throw new BadRequestError('Field "title" is required');
        }

        if (description !== undefined && typeof description !== 'string') {
            throw new BadRequestError('Field "description" must be a string');
        }
    
        const quest = await questService.createQuest({
          title: title.trim(),
          description: description?.trim() || undefined,
        });
    
        res.status(201).json(quest);
    }),

    updateQuest: asyncHandler(async (req: Request, res: Response) => {
        const id = parseId(req.params.id, 'quest');
        const { title, description } = req.body;
        const data: { title?: string; description?: string | null } = {};

        if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
            throw new BadRequestError('Field "title" must be a non-empty string');
        }
        data.title = title.trim();
        }

        if (description !== undefined) {
        if (description !== null && typeof description !== 'string') {
            throw new BadRequestError('Field "description" must be a string or null');
        }
        data.description = description === null ? null : description.trim();
        }

        if (Object.keys(data).length === 0) {
        throw new BadRequestError('No fields to update');
        }

        const quest = await questService.updateQuest(id, data);
        res.status(200).json(quest);
    }),

    deleteQuest: asyncHandler(async (req: Request, res: Response) => {
        const id = parseId(req.params.id, 'quest');
        const quest = await questService.deleteQuest(id);
        res.status(200).json({ message: 'Quest deleted', quest });
    }),
}