import { SourceType } from '@prisma/client';
import { z } from 'zod';

export const createSectionSchema = z
  .object({
    key: z.string().trim().regex(/^[A-Z0-9_]{2,60}$/, 'Ključ sekcije: velika slova, brojevi i _.'),
    title: z.string().trim().min(1).max(300),
    required: z.boolean().default(false),
  })
  .strict();
export type CreateSectionDto = z.infer<typeof createSectionSchema>;

export const updateSectionSchema = z
  .object({ title: z.string().trim().min(1).max(300), required: z.boolean() })
  .partial()
  .strict();
export type UpdateSectionDto = z.infer<typeof updateSectionSchema>;

export const draftContentSchema = z
  .object({
    content: z.string().max(50000),
    sourceType: z.nativeEnum(SourceType).optional(),
    sourceReference: z.string().trim().max(2000).nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
  })
  .strict();
export type DraftContentDto = z.infer<typeof draftContentSchema>;

export const terminologyCheckSchema = z.object({ text: z.string().max(100000) }).strict();
