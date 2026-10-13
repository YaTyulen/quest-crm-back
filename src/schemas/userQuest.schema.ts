import { z } from 'zod';

export const updateUserQuestsSchema = z.object({
  questIds: z.array(z.number().int().positive()).min(0),
});

export type UpdateUserQuestsInput = z.infer<typeof updateUserQuestsSchema>;