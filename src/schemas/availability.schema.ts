import { z } from 'zod';

// Формат даты: "2026-09-25" (только дата, без времени)
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const getMyAvailabilityQuerySchema = z.object({
  questId: z.coerce.number().int().positive(),
  from: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
  to: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
});

export const saveMyAvailabilitySchema = z.object({
  items: z.array(
    z.object({
      questId: z.number().int().positive(),
      slotId: z.number().int().positive(),
      date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
      canWork: z.boolean(),
    })
  ).min(1, 'At least one item is required'),
});

export type GetMyAvailabilityQuery = z.infer<typeof getMyAvailabilityQuerySchema>;
export type SaveMyAvailabilityInput = z.infer<typeof saveMyAvailabilitySchema>;