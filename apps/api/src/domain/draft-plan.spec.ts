import { DEFAULT_APPLICATION_SECTIONS } from './application-sections';
import { DESCRIPTION_MAX_TOKENS, planDraftSections, SECTION_MAX_TOKENS, targetWordsFor, TITLE_TARGET_WORDS } from './draft-plan';

const defaults = DEFAULT_APPLICATION_SECTIONS.map((s, i) => ({ key: s.key, title: s.title, position: i + 1 }));

describe('planDraftSections', () => {
  it('orders the default sections title → features → description → purpose → lists', () => {
    const plan = planDraftSections([...defaults].reverse(), 5);
    expect(plan.map((p) => p.key)).toEqual(['TITLE', 'CHARACTERISTIC_FEATURES', 'DESCRIPTION', 'PURPOSE', 'REPRESENTATION_LIST', 'ATTACHMENT_LIST']);
  });

  it('gives the description ~70 % of the target words and the features ~15 %', () => {
    const plan = planDraftSections(defaults, 5); // 2 500 words
    const words = Object.fromEntries(plan.map((p) => [p.key, p.targetWords]));
    expect(words.DESCRIPTION).toBe(1750);
    expect(words.CHARACTERISTIC_FEATURES).toBe(375);
    expect(words.PURPOSE).toBe(125);
    expect(words.REPRESENTATION_LIST).toBe(125);
    expect(words.ATTACHMENT_LIST).toBe(125);
    expect(words.TITLE).toBe(TITLE_TARGET_WORDS);
    const total = plan.reduce((n, p) => n + p.targetWords, 0);
    expect(total).toBeGreaterThanOrEqual(2500);
    expect(total).toBeLessThanOrEqual(2500 + TITLE_TARGET_WORDS);
  });

  it('never asks for fewer than 40 words in a prose section, whatever the target', () => {
    expect(targetWordsFor('PURPOSE', 1)).toBe(40);
    expect(targetWordsFor('ATTACHMENT_LIST', 1)).toBe(40);
    expect(targetWordsFor('DESCRIPTION', 1)).toBe(350);
    expect(targetWordsFor('TITLE', 30)).toBe(TITLE_TARGET_WORDS);
  });

  it('puts custom sections after the known ones, in their position order, with a small share', () => {
    const plan = planDraftSections([...defaults, { key: 'ZZ_EXTRA', title: 'Dodatak', position: 9 }, { key: 'AA_EXTRA', title: 'Uvod', position: 8 }], 10);
    expect(plan.map((p) => p.key).slice(-2)).toEqual(['AA_EXTRA', 'ZZ_EXTRA']);
    expect(plan.at(-1)!.targetWords).toBe(250);
  });

  it('budgets 32k output tokens for the description and 12k for every other section', () => {
    const plan = planDraftSections(defaults, 5);
    for (const p of plan) expect(p.maxTokens).toBe(p.key === 'DESCRIPTION' ? DESCRIPTION_MAX_TOKENS : SECTION_MAX_TOKENS);
  });
});
