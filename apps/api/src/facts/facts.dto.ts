import { FactCategory, InformationKind, SourceType } from '@prisma/client';
import { z } from 'zod';

// Note: there is deliberately no `verified` / `confirmedBy` field in any input schema.
// Confirmation happens only through POST /facts/:id/confirm.

export const createFactSchema = z
  .object({
    category: z.nativeEnum(FactCategory).default('PRODUCT'),
    kind: z.nativeEnum(InformationKind),
    statement: z.string().trim().min(1).max(2000),
    value: z.string().trim().max(10000).default(''),
    sourceType: z.nativeEnum(SourceType),
    sourceReference: z.string().trim().max(2000).nullable().optional(),
    sourceDocumentId: z.string().uuid().nullable().optional(),
    uploadedFileId: z.string().uuid().nullable().optional(),
    userAnswerId: z.string().uuid().nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
  })
  .strict();
export type CreateFactDto = z.infer<typeof createFactSchema>;

export const updateFactSchema = z
  .object({
    category: z.nativeEnum(FactCategory),
    statement: z.string().trim().min(1).max(2000),
    value: z.string().trim().max(10000),
    confidence: z.number().min(0).max(1).nullable(),
  })
  .partial()
  .strict();
export type UpdateFactDto = z.infer<typeof updateFactSchema>;

export const confirmFactSchema = z.object({ explicitUserConfirmation: z.literal(true) }).strict();
export type ConfirmFactDto = z.infer<typeof confirmFactSchema>;
