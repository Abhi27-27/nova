import { z } from 'zod';
import { optionalTrimmedString } from './common.js';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80).optional(),
  jobTitle: optionalTrimmedString(80),
  timezone: optionalTrimmedString(64),
  avatarUrl: z
    .union([z.string().trim().url('Enter a valid URL'), z.literal(''), z.null()])
    .transform((value) => (value === '' || value === null ? null : value))
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
