export const DEFAULT_AI_MODEL = 'claude-opus-5-5';
export const DEFAULT_MAX_CALLS_PER_PROJECT_PER_DAY = 50;
/** Upper bound of the variable part of the prompt (step state + document text), in characters. */
export const DEFAULT_MAX_CONTEXT_CHARS = 300_000;

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

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.apiKey = env.ANTHROPIC_API_KEY?.trim() || null;
    this.model = env.ANTHROPIC_MODEL?.trim() || DEFAULT_AI_MODEL;
    this.maxCallsPerProjectPerDay = positiveInt(env.AI_MAX_CALLS_PER_PROJECT_PER_DAY, DEFAULT_MAX_CALLS_PER_PROJECT_PER_DAY);
    this.maxContextChars = positiveInt(env.AI_MAX_CONTEXT_CHARS, DEFAULT_MAX_CONTEXT_CHARS);
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
      notConfiguredMessage: this.configured ? null : 'AI provera nije konfigurisana.',
    };
  }

  toJSON() {
    return this.publicStatus();
  }
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
