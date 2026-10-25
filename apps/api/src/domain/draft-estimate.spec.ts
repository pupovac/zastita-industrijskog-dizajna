import { DEFAULT_APPLICATION_SECTIONS } from './application-sections';
import { estimateDraft, LARGE_CONTEXT_TOKENS } from './draft-estimate';
import { planDraftSections } from './draft-plan';

const plan = planDraftSections(
  DEFAULT_APPLICATION_SECTIONS.map((s, i) => ({ key: s.key, title: s.title, position: i + 1 })),
  5,
);

describe('estimateDraft', () => {
  it('counts one call per section and derives tokens from the size of the text', () => {
    const e = estimateDraft({ model: 'claude-opus-5-5', systemChars: 30_000, contextChars: 62_900, imageCount: 3, plan });
    expect(e.calls).toBe(6);
    expect(e.inputTokensPerCall).toBe(Math.round(92_900 / 1.85) + 3_600);
    expect(e.outputTokens).toBe(Math.round(2512 * 2.5 * 4));
    expect(e.largeContext).toBe(false);
    expect(e.durationSeconds.min).toBeGreaterThan(60);
    expect(e.durationSeconds.max).toBeGreaterThan(e.durationSeconds.min);
    expect(e.estimatedCostUsd).toBeGreaterThan(0.5);
    expect(e.estimatedCostUsd).toBeLessThan(2);
  });

  it('reproduces the first production run within ~15 % (5 pages, 81 906 chars, no images: 240 s, $0.84)', () => {
    const e = estimateDraft({ model: 'claude-opus-5-5', systemChars: 60_422, contextChars: 21_484, imageCount: 0, plan });
    expect(e.inputTokensPerCall).toBeGreaterThan(40_000);
    expect(e.inputTokensPerCall).toBeLessThan(50_000);
    expect(e.outputTokens).toBeGreaterThan(21_000);
    expect(e.outputTokens).toBeLessThan(28_000);
    expect(e.durationSeconds.min).toBeLessThan(240);
    expect(e.durationSeconds.max).toBeGreaterThan(240);
    expect(e.estimatedCostUsd!).toBeGreaterThan(0.72);
    expect(e.estimatedCostUsd!).toBeLessThan(0.97);
  });

  it('flags a context above 80k tokens and reports no cost for an unknown model', () => {
    const e = estimateDraft({ model: 'nepoznat-model', systemChars: 30_000, contextChars: 2 * LARGE_CONTEXT_TOKENS, imageCount: 0, plan });
    expect(e.largeContext).toBe(true);
    expect(e.estimatedCostUsd).toBeNull();
  });

  it('caches the prefix once and reads it on every later call', () => {
    const one = estimateDraft({ model: 'claude-opus-5-5', systemChars: 0, contextChars: 300_000, imageCount: 0, plan: plan.slice(0, 1) });
    const six = estimateDraft({ model: 'claude-opus-5-5', systemChars: 0, contextChars: 300_000, imageCount: 0, plan });
    // Six calls over the same 100k-token prefix cost far less than six cache writes would.
    expect(six.estimatedCostUsd!).toBeLessThan(one.estimatedCostUsd! * 3);
  });
});
