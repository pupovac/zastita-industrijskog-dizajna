import { AiDraftMode } from '@prisma/client';
import { z } from 'zod';

export const generateDraftSchema = z
  .object({
    mode: z.nativeEnum(AiDraftMode).default('GENERATE'),
    /** Overrides the project setting for this call only. */
    targetPages: z.number().int().min(1).max(30).optional(),
    /** The user explicitly allows confirmed sections to be replaced with the AI text. */
    replaceConfirmed: z.boolean().default(false),
  })
  .strict();
export type GenerateDraftDto = z.infer<typeof generateDraftSchema>;

export const decideDraftSectionSchema = z
  .object({
    /** Required to accept a HELD section (the section was confirmed when the draft was made). */
    replaceConfirmed: z.boolean().default(false),
  })
  .strict();
export type DecideDraftSectionDto = z.infer<typeof decideDraftSectionSchema>;
