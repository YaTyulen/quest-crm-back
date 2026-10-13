import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createSlotSchema = z.object({
  time: z.string().regex(timeRegex, 'Time must be in HH:MM format'),
  order: z.number().int().positive('Order must be a positive integer'),
  isActive: z.boolean().optional(),
});

export const updateSlotSchema = z.object({
  time: z.string().regex(timeRegex, 'Time must be in HH:MM format').optional(),
  order: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export type CreateSlotInput = z.infer<typeof createSlotSchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;