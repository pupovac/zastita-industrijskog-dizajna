import { ReviewIssueStatus, Severity, SourceType } from '@prisma/client';
import { z } from 'zod';
import { REVIEW_CHECK_KEYS } from '../domain/review-rules';
import { STEP_KEYS } from '../domain/steps';

const stepKey = z.enum(STEP_KEYS as [string, ...string[]]);

export const createFindingSchema = z
  .object({
    /** The step the finding refers to. */
    stepKey: stepKey.nullable().optional(),
    type: z.enum(['FINDING', 'RISK']).default('FINDING'),
    severity: z.nativeEnum(Severity),
    title: z.string().trim().min(1).max(1000),
    description: z.string().trim().max(10000).default(''),
    checkKey: z.enum(REVIEW_CHECK_KEYS).nullable().optional(),
    sourceType: z.nativeEnum(SourceType).default('AGENT_INFERENCE'),
    sourceReference: z.string().trim().max(2000).nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
  })
  .strict();
export type CreateFindingDto = z.infer<typeof createFindingSchema>;

export const updateFindingSchema = z
  .object({
    stepKey: stepKey.nullable(),
    severity: z.nativeEnum(Severity),
    title: z.string().trim().min(1).max(1000),
    description: z.string().trim().max(10000),
    checkKey: z.enum(REVIEW_CHECK_KEYS).nullable(),
  })
  .partial()
  .strict();
export type UpdateFindingDto = z.infer<typeof updateFindingSchema>;

export const findingStatusSchema = z
  .object({ status: z.nativeEnum(ReviewIssueStatus), note: z.string().trim().max(4000).optional() })
  .strict();
export type FindingStatusDto = z.infer<typeof findingStatusSchema>;
