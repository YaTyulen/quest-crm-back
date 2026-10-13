import { z } from 'zod';

export const updateQuestSlotsSchema = z.object({
  slotIds: z.array(z.number().int().positive()).min(0),
});

export type UpdateQuestSlotsInput = z.infer<typeof updateQuestSlotsSchema>;