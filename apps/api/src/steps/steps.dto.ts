import { StepStatus } from '@prisma/client';
import { z } from 'zod';

export const transitionStepSchema = z.object({
  to: z.nativeEnum(StepStatus),
  reason: z.string().trim().max(1000).optional(),
});
export type TransitionStepDto = z.infer<typeof transitionStepSchema>;
