import { z } from 'zod';
import { hexColorSchema } from './common.js';

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, 'Enter a label name').max(32),
  color: hexColorSchema.default('#6366f1'),
});

export const updateLabelSchema = createLabelSchema.partial();

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
