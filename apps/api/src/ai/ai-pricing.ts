/**
 * List prices per million tokens (USD) for the models the review may run on.
 * Used only to estimate the cost of a call for the user; billing is Anthropic's.
 * Cache writes are billed at 1.25× the input price.
 */
interface ModelPricing {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

const PRICING: Record<string, ModelPricing> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-opus-5': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-opus-4-8': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-opus-4-7': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-fable-5-1': { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

/** Longest known model id that prefixes the served model name (e.g. a dated snapshot). */
function pricingFor(model: string): ModelPricing | null {
  const match = Object.keys(PRICING)
    .filter((id) => model === id || model.startsWith(`${id}-`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PRICING[match] : null;
}

/** Estimated cost in USD, or null when the model's prices are unknown. */
export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  const price = pricingFor(model);
  if (!price) return null;
  const perMillion =
    usage.inputTokens * price.input +
    usage.outputTokens * price.output +
    usage.cacheReadTokens * price.cacheRead +
    usage.cacheCreationTokens * price.cacheWrite;
  return Math.round((perMillion / 1_000_000) * 1_000_000) / 1_000_000;
}
