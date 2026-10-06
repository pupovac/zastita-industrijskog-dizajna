import { z } from 'zod';
import { STEP_KEYS } from '../domain/steps';

const stepKey = z.enum(STEP_KEYS as [string, ...string[]]);

export const createQuestionSchema = z.object({
  stepKey,
  text: z.string().trim().min(1).max(2000),
  whyNeeded: z.string().trim().max(2000).default(''),
  exampleAnswer: z.string().trim().max(2000).default(''),
  required: z.boolean().default(false),
  deferredToFiling: z.boolean().default(false),
  allowsAttachment: z.boolean().default(true),
});
export type CreateQuestionDto = z.infer<typeof createQuestionSchema>;

export const updateQuestionSchema = z.object({ deferredToFiling: z.boolean() });
export type UpdateQuestionDto = z.infer<typeof updateQuestionSchema>;

export const saveAnswerSchema = z.object({
  value: z.string().max(20000),
  attachmentFileId: z.string().uuid().nullable().optional(),
});
export type SaveAnswerDto = z.infer<typeof saveAnswerSchema>;
