import { z } from 'zod';

export const updateSettingsSchema = z.object({
  availabilityHorizonDays: z
    .number()
    .int('Must be an integer')
    .min(1, 'Must be at least 1 day')
    .max(90, 'Must be at most 90 days'),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;