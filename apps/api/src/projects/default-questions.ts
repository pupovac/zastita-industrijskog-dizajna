import { z } from 'zod';
import { INTERVIEW_GROUP_KEYS, InterviewGroupKey } from '../domain/interview-groups';
import { STEP_KEYS, StepKey } from '../domain/steps';
import bank from './default-question-bank.json';

/**
 * Interview questions of step 4, groups A–G, loaded from `default-question-bank.json`
 * (the question bank written by the interviewer agent, FUZZ-143; readable version in
 * `docs/faza-3/banka-pitanja-i-primeri.md`).
 * The bank is not named `default-questions.json` on purpose: Jest resolves `.json` before
 * `.ts`, so `import './default-questions'` would load the JSON instead of this module.
 * They only collect information from the user; they make no legal claims.
 * Specialized agents can add further questions through the API.
 *
 * Example answers are templates: `[oznaka]` markers show where the user must put
 * their own data. Nothing in them is a statement about the applicant's product.
 */
export interface DefaultQuestion {
  /** Stable identity across releases; refresh-defaults matches existing questions by it. */
  defaultKey: string;
  /** The question's label in the interviewer's document (A1…G4); informational only. */
  bankId?: string;
  stepKey: StepKey;
  interviewGroup: InterviewGroupKey;
  text: string;
  /** Earlier wordings of this question, so projects created before `defaultKey` existed can adopt it. */
  legacyTexts: string[];
  whyNeeded: string;
  /** Requirement-matrix codes (MZ-xxx / NS-xx) behind `whyNeeded`; the source of the "why", not persisted. */
  mzRefs?: string[];
  exampleAnswer: string;
  /** "Obavezno pomenite": what a complete answer must cover. */
  includeHints: string[];
  /** "Ne pišite": what does not belong in a design description. */
  avoidHints: string[];
  required: boolean;
  highPriority: boolean;
}

const defaultQuestionSchema = z.object({
  defaultKey: z.string().trim().min(1).max(100),
  bankId: z.string().trim().min(1).max(10).optional(),
  stepKey: z.enum(STEP_KEYS as [string, ...string[]]),
  interviewGroup: z.enum(INTERVIEW_GROUP_KEYS),
  text: z.string().trim().min(1).max(2000),
  legacyTexts: z.array(z.string().trim().min(1).max(2000)).default([]),
  whyNeeded: z.string().trim().max(2000).default(''),
  mzRefs: z.array(z.string().trim().regex(/^(MZ|NS)-\d+$/)).optional(),
  exampleAnswer: z.string().trim().max(4000).default(''),
  includeHints: z.array(z.string().trim().min(1).max(500)).default([]),
  avoidHints: z.array(z.string().trim().min(1).max(500)).default([]),
  required: z.boolean().default(false),
  highPriority: z.boolean().default(false),
});

const bankSchema = z.object({ version: z.string(), questions: z.array(defaultQuestionSchema).min(1) });

function loadBank(): DefaultQuestion[] {
  const parsed = bankSchema.parse(bank);
  const keys = new Set<string>();
  for (const q of parsed.questions) {
    if (keys.has(q.defaultKey)) throw new Error(`default-question-bank.json: duplicate defaultKey "${q.defaultKey}"`);
    keys.add(q.defaultKey);
  }
  return parsed.questions as DefaultQuestion[];
}

export const DEFAULT_QUESTIONS: DefaultQuestion[] = loadBank();

export const DEFAULT_QUESTION_BANK_VERSION: string = bank.version;

/** The columns a default question writes when it is created on a project. */
export function defaultQuestionData(q: DefaultQuestion) {
  return {
    defaultKey: q.defaultKey,
    stepKey: q.stepKey,
    interviewGroup: q.interviewGroup,
    text: q.text,
    whyNeeded: q.whyNeeded,
    exampleAnswer: q.exampleAnswer,
    includeHintsJson: JSON.stringify(q.includeHints),
    avoidHintsJson: JSON.stringify(q.avoidHints),
    required: q.required,
    highPriority: q.highPriority,
  };
}
