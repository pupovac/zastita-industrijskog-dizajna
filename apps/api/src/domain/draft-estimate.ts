import { estimateCostUsd } from '../ai/ai-pricing';
import { PlannedSection } from './draft-plan';

/**
 * What the user sees before starting an AI draft (FUZZ-145, „Procena pre pokretanja"):
 * number of calls, expected duration, rough cost and the size of the context. All
 * numbers are estimates from the size of the text and the target length — the real
 * values are measured per section while the job runs. The constants are calibrated on
 * the first production run (FUZZ-145, 2026-10-25, claude-opus-5-5, effort medium,
 * 5 pages, 6 calls): 81 906 chars of prefix → 44 818 tokens; 2 440 words → 24 270
 * output tokens (text + thinking + notes); 240 s; $0.84.
 */

/** Serbian Latin text with diacritics inside JSON: fewer than 2 characters per token (measured 1.83). */
const CHARS_PER_TOKEN = 1.85;
/** The API scales images to ≤ 1.15 MP; a typical render or photo costs about this many tokens. */
const TOKENS_PER_IMAGE = 1_200;
/** Serbian text with diacritics: about 2.5 output tokens per word. */
const OUTPUT_TOKENS_PER_WORD = 2.5;
/** Thinking (adaptive, medium effort), the notes and the JSON wrapper on top of the text itself (measured ~4×). */
const OUTPUT_OVERHEAD = 4;
/** Observed on claude-opus-5-5 with streaming: ~130 output tokens per second plus a few seconds per call. */
const OUTPUT_TOKENS_PER_SECOND = 130;
const SECONDS_PER_CALL = 8;
/** Above this many input tokens per call the user is told to trim the attached documents. */
export const LARGE_CONTEXT_TOKENS = 80_000;

export interface DraftEstimateInput {
  model: string;
  /** Characters of the stable prefix (system prompt, matrix, example). */
  systemChars: number;
  /** Characters of the project state sent with every call. */
  contextChars: number;
  imageCount: number;
  plan: PlannedSection[];
}

export interface DraftEstimate {
  calls: number;
  inputTokensPerCall: number;
  outputTokens: number;
  /** Seconds, a range. */
  durationSeconds: { min: number; max: number };
  estimatedCostUsd: number | null;
  largeContext: boolean;
}

export function estimateDraft(input: DraftEstimateInput): DraftEstimate {
  const calls = input.plan.length;
  const inputTokensPerCall = Math.round((input.systemChars + input.contextChars) / CHARS_PER_TOKEN + input.imageCount * TOKENS_PER_IMAGE);
  const targetWords = input.plan.reduce((n, p) => n + p.targetWords, 0);
  const outputTokens = Math.round(targetWords * OUTPUT_TOKENS_PER_WORD * OUTPUT_OVERHEAD);
  // Previously written sections ride along as context in later calls (uncached, roughly the text written so far).
  const carriedTokens = Math.round(targetWords * OUTPUT_TOKENS_PER_WORD * Math.max(0, calls - 1) * 0.7);
  const seconds = calls * SECONDS_PER_CALL + outputTokens / OUTPUT_TOKENS_PER_SECOND;
  const cost = estimateCostUsd(input.model, {
    inputTokens: carriedTokens,
    outputTokens,
    cacheCreationTokens: inputTokensPerCall,
    cacheReadTokens: inputTokensPerCall * Math.max(0, calls - 1),
  });
  return {
    calls,
    inputTokensPerCall,
    outputTokens,
    durationSeconds: { min: Math.round(seconds * 0.7), max: Math.round(seconds * 1.6) },
    estimatedCostUsd: cost,
    largeContext: inputTokensPerCall > LARGE_CONTEXT_TOKENS,
  };
}
