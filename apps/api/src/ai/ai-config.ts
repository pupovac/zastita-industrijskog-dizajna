export const DEFAULT_AI_MODEL = 'claude-opus-5-5';
export const DEFAULT_MAX_CALLS_PER_PROJECT_PER_DAY = 50;
/** Upper bound of the variable part of the prompt (step state + document text), in characters. */
export const DEFAULT_MAX_CONTEXT_CHARS = 300_000;
/** „Ciljna dužina opisa" when the project has no setting of its own (FUZZ-142). */
export const DEFAULT_DRAFT_TARGET_PAGES = 5;
/** Images (representations, photos, renders) sent with one draft request. */
export const DEFAULT_DRAFT_MAX_IMAGES = 12;
/** `output_config.effort` of the draft's section calls (FUZZ-145): writing to a well-defined template needs no deep thinking. */
export const DEFAULT_DRAFT_EFFORT: AiEffort = 'medium';
/** `output_config.effort` of the step review: a check that has to find what is wrong. */
export const REVIEW_EFFORT: AiEffort = 'high';

export const AI_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type AiEffort = (typeof AI_EFFORTS)[number];

/**
 * Configuration of the AI review, read from the environment once. The API key stays
 * inside this object: it is never logged, never serialised and never sent to the web client.
 * Provided through a factory in AiModule (the constructor argument is not an injectable).
 */
export class AiConfig {
  readonly apiKey: string | null;
  readonly model: string;
  readonly maxCallsPerProjectPerDay: number;
  readonly maxContextChars: number;
  readonly draftTargetPages: number;
  readonly draftMaxImages: number;
  readonly draftEffort: AiEffort;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.apiKey = env.ANTHROPIC_API_KEY?.trim() || null;
    this.model = env.ANTHROPIC_MODEL?.trim() || DEFAULT_AI_MODEL;
    this.maxCallsPerProjectPerDay = positiveInt(env.AI_MAX_CALLS_PER_PROJECT_PER_DAY, DEFAULT_MAX_CALLS_PER_PROJECT_PER_DAY);
    this.maxContextChars = positiveInt(env.AI_MAX_CONTEXT_CHARS, DEFAULT_MAX_CONTEXT_CHARS);
    this.draftTargetPages = positiveInt(env.AI_DRAFT_TARGET_PAGES, DEFAULT_DRAFT_TARGET_PAGES);
    this.draftMaxImages = positiveInt(env.AI_DRAFT_MAX_IMAGES, DEFAULT_DRAFT_MAX_IMAGES);
    this.draftEffort = effort(env.AI_DRAFT_EFFORT, DEFAULT_DRAFT_EFFORT);
  }

  get configured(): boolean {
    return this.apiKey !== null;
  }

  /** What the web client may know. */
  publicStatus() {
    return {
      configured: this.configured,
      model: this.model,
      maxCallsPerProjectPerDay: this.maxCallsPerProjectPerDay,
      draftTargetPages: this.draftTargetPages,
      draftEffort: this.draftEffort,
      notConfiguredMessage: this.configured ? null : 'AI provera nije konfigurisana.',
    };
  }

  toJSON() {
    return this.publicStatus();
  }
}

function effort(value: string | undefined, fallback: AiEffort): AiEffort {
  const v = value?.trim().toLowerCase();
  return (AI_EFFORTS as readonly string[]).includes(v ?? '') ? (v as AiEffort) : fallback;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
