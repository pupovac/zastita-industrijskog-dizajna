import { z } from 'zod';

/**
 * The structured answer of the AI description draft (FUZZ-142). The JSON schema is sent
 * to the model (`output_config.format`); the Zod schema validates what comes back. Both
 * must agree. Every text in it is an AI inference until the user confirms the section.
 */

export const aiDraftSectionSchema = z.object({
  key: z.string().trim().min(1),
  content: z.string(),
  /** The model's own count; the server recounts and stores its own number. */
  placeholders: z.number().int().min(0),
});

export const aiDraftResponseSchema = z.object({
  sections: z.array(aiDraftSectionSchema),
  notes: z.array(z.string()),
});
export type AiDraftResponse = z.infer<typeof aiDraftResponseSchema>;

/** JSON schema for `output_config.format` (structured outputs): objects closed, every key required. */
export const AI_DRAFT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sections', 'notes'],
  properties: {
    sections: {
      type: 'array',
      description: 'Jedna stavka po sekciji opisa, sa ključem sekcije iz konteksta.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'content', 'placeholders'],
        properties: {
          key: { type: 'string', description: 'Ključ sekcije (npr. TITLE, DESCRIPTION) tačno kako je naveden u kontekstu.' },
          content: { type: 'string', description: 'Ceo tekst sekcije, srpski, latinica. Pasusi razdvojeni praznim redom.' },
          placeholders: { type: 'integer', description: 'Broj markera „[POTREBNA DOPUNA: …]" u tekstu sekcije.' },
        },
      },
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Kratke napomene za korisnika: šta je nedostajalo, šta je namerno izostavljeno, šta treba proveriti.',
    },
  },
} as const;

// --- One section per call (FUZZ-145) -------------------------------------------------

export const aiDraftSectionCallSchema = z.object({
  content: z.string(),
  /** The model's own count; the server recounts and stores its own number. */
  placeholders: z.number().int().min(0),
  notes: z.array(z.string()),
});
export type AiDraftSectionCall = z.infer<typeof aiDraftSectionCallSchema>;

/** JSON schema of one section call: the text of that section only, plus notes for the user. */
export const AI_DRAFT_SECTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['content', 'placeholders', 'notes'],
  properties: {
    content: { type: 'string', description: 'Ceo tekst tražene sekcije, srpski, latinica. Pasusi razdvojeni praznim redom. Bez naslova sekcije na početku.' },
    placeholders: { type: 'integer', description: 'Broj markera „[POTREBNA DOPUNA: …]" u tekstu sekcije.' },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Kratke napomene za korisnika o ovoj sekciji: šta je nedostajalo, šta je namerno izostavljeno, šta treba proveriti. Prazno ako nema ničega.',
    },
  },
} as const;

export type SectionParseResult = { ok: true; response: AiDraftSectionCall } | { ok: false; error: string };

/** Parses one section call's text into a validated response; never throws. */
export function parseAiDraftSectionResponse(text: string): SectionParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Odgovor modela nije validan JSON: ${(e as Error).message}` };
  }
  const result = aiDraftSectionCallSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    return { ok: false, error: `Odgovor modela ne odgovara šemi: ${issues}` };
  }
  return { ok: true, response: result.data };
}

export type DraftParseResult = { ok: true; response: AiDraftResponse } | { ok: false; error: string };

/** Parses the model's text into a validated response; never throws. */
export function parseAiDraftResponse(text: string): DraftParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Odgovor modela nije validan JSON: ${(e as Error).message}` };
  }
  const result = aiDraftResponseSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    return { ok: false, error: `Odgovor modela ne odgovara šemi: ${issues}` };
  }
  return { ok: true, response: result.data };
}
