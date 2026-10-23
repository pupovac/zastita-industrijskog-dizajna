import { estimateCostUsd } from './ai-pricing';

describe('AI cost estimate', () => {
  it('prices uncached, cached and written tokens separately', () => {
    const cost = estimateCostUsd('claude-opus-5-5', {
      inputTokens: 1_000_000,
      outputTokens: 100_000,
      cacheReadTokens: 1_000_000,
      cacheCreationTokens: 0,
    });
    expect(cost).toBeCloseTo(4 + 2 + 0.2, 6);
  });

  it('matches a dated snapshot of a known model and returns null for an unknown one', () => {
    expect(estimateCostUsd('claude-sonnet-5-5-20260901', { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 })).toBe(2);
    expect(estimateCostUsd('some-other-model', { inputTokens: 10, outputTokens: 10, cacheReadTokens: 0, cacheCreationTokens: 0 })).toBeNull();
  });
});
