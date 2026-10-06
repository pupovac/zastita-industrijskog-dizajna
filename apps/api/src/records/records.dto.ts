import { SourceType } from '@prisma/client';
import { z } from 'zod';
import { STEP_KEYS } from '../domain/steps';

const stepKey = z.enum(STEP_KEYS as [string, ...string[]]);

export const createOpenQuestionSchema = z.object({
  stepKey: stepKey.nullable().optional(),
  text: z.string().trim().min(1).max(2000),
  whyNeeded: z.string().trim().max(2000).default(''),
  blocking: z.boolean().default(false),
  deferredToFiling: z.boolean().default(false),
  sourceType: z.nativeEnum(SourceType).optional(),
  sourceReference: z.string().trim().max(2000).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});
export type CreateOpenQuestionDto = z.infer<typeof createOpenQuestionSchema>;

export const answerOpenQuestionSchema = z.object({ answer: z.string().trim().min(1).max(10000) });
export type AnswerOpenQuestionDto = z.infer<typeof answerOpenQuestionSchema>;

export const createDecisionSchema = z.object({
  stepKey: stepKey.nullable().optional(),
  title: z.string().trim().min(1).max(1000),
  rationale: z.string().trim().max(10000).default(''),
  sourceReference: z.string().trim().max(2000).nullable().optional(),
});
export type CreateDecisionDto = z.infer<typeof createDecisionSchema>;
