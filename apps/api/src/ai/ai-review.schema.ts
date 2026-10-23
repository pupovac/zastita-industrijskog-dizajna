import { z } from 'zod';
import { SUGGESTION_ENTITIES } from '../domain/step-guides';

/**
 * The structured answer of the AI review. The JSON schema below is sent to the model
 * (`output_config.format`); the Zod schema validates what comes back. Both must agree.
 * Everything in it is an AI inference until the user accepts a suggestion.
 */

export const AI_SEVERITIES = ['BLOCKER', 'VISOK', 'SREDNJI', 'NIZAK'] as const;
export type AiSeverity = (typeof AI_SEVERITIES)[number];

const nullableText = z.string().nullable();
const mzCode = z
  .string()
  .nullable()
  .transform((v) => (v && v.trim() ? v.trim().toUpperCase() : null));

export const aiFindingSchema = z.object({
  severity: z.enum(AI_SEVERITIES),
  title: z.string().min(1),
  detail: z.string(),
  relatedRequirement: mzCode,
  relatedField: nullableText,
});
export type AiFinding = z.infer<typeof aiFindingSchema>;

export const aiSuggestionTargetSchema = z.object({
  entity: z.enum(SUGGESTION_ENTITIES),
  id: nullableText.transform((v) => (v && v.trim() ? v.trim() : null)),
  field: z.string().min(1),
});
export type AiSuggestionTarget = z.infer<typeof aiSuggestionTargetSchema>;

export const aiSuggestionSchema = z.object({
  target: aiSuggestionTargetSchema,
  proposedValue: z.string().min(1),
  rationale: z.string(),
  requirementRef: mzCode,
});
export type AiSuggestionProposal = z.infer<typeof aiSuggestionSchema>;

export const aiReviewResponseSchema = z.object({
  summary: z.string(),
  findings: z.array(aiFindingSchema),
  suggestions: z.array(aiSuggestionSchema),
  openQuestions: z.array(z.string()),
});
export type AiReviewResponse = z.infer<typeof aiReviewResponseSchema>;

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };

/** JSON schema for `output_config.format` (structured outputs): objects closed, every key required. */
export const AI_REVIEW_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'findings', 'suggestions', 'openQuestions'],
  properties: {
    summary: { type: 'string', description: 'Kratak sažetak stanja koraka (2–5 rečenica), srpski, latinica.' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'title', 'detail', 'relatedRequirement', 'relatedField'],
        properties: {
          severity: { type: 'string', enum: [...AI_SEVERITIES] },
          title: { type: 'string' },
          detail: { type: 'string' },
          relatedRequirement: { ...nullableString, description: 'Oznaka zahteva iz matrice (MZ-xxx ili NS-xx) ili null.' },
          relatedField: { ...nullableString, description: 'Entitet/polje na koje se nalaz odnosi, ili null.' },
        },
      },
    },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['target', 'proposedValue', 'rationale', 'requirementRef'],
        properties: {
          target: {
            type: 'object',
            additionalProperties: false,
            required: ['entity', 'id', 'field'],
            properties: {
              entity: { type: 'string', enum: [...SUGGESTION_ENTITIES] },
              id: { ...nullableString, description: 'id postojećeg zapisa iz konteksta, ili null za nov zapis.' },
              field: { type: 'string' },
            },
          },
          proposedValue: { type: 'string' },
          rationale: { type: 'string' },
          requirementRef: { ...nullableString, description: 'Oznaka zahteva iz matrice na koju se predlog oslanja, ili null.' },
        },
      },
    },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
} as const;

export type ParseResult = { ok: true; response: AiReviewResponse } | { ok: false; error: string };

/** Parses the model's text into a validated response; never throws. */
export function parseAiReviewResponse(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Odgovor modela nije validan JSON: ${(e as Error).message}` };
  }
  const result = aiReviewResponseSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    return { ok: false, error: `Odgovor modela ne odgovara šemi: ${issues}` };
  }
  return { ok: true, response: result.data };
}
