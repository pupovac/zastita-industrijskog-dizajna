import { WORDS_PER_PAGE } from './draft-length';

/**
 * How one AI draft (FUZZ-145) is split into model calls: one call per section, in a fixed
 * order, each with its own share of the target length and its own output budget. The
 * description comes after the title and the characteristic elements (so it can build on
 * them) and before the short lists (so they can refer to it).
 */

export interface PlannedSection {
  key: string;
  title: string;
  /** Words the prompt asks for in this section. */
  targetWords: number;
  /** `max_tokens` of the section's call (streaming, so a large value costs nothing up front). */
  maxTokens: number;
}

/** Fixed call order of the default sections; unknown (custom) sections follow in their own order. */
export const SECTION_CALL_ORDER = ['TITLE', 'CHARACTERISTIC_FEATURES', 'DESCRIPTION', 'PURPOSE', 'REPRESENTATION_LIST', 'ATTACHMENT_LIST'] as const;

/** Share of the target word count per section; TITLE is a fixed few words, not a share. */
const WORD_SHARE: Record<string, number> = {
  DESCRIPTION: 0.7,
  CHARACTERISTIC_FEATURES: 0.15,
  PURPOSE: 0.05,
  REPRESENTATION_LIST: 0.05,
  ATTACHMENT_LIST: 0.05,
};
const CUSTOM_SECTION_SHARE = 0.05;
export const TITLE_TARGET_WORDS = 12;
/** A section is never asked for fewer words than this (a one-line list still needs a sentence or two). */
const MIN_TARGET_WORDS = 40;

export const DESCRIPTION_MAX_TOKENS = 32_000;
export const SECTION_MAX_TOKENS = 12_000;

export function sectionMaxTokens(key: string): number {
  return key === 'DESCRIPTION' ? DESCRIPTION_MAX_TOKENS : SECTION_MAX_TOKENS;
}

export function targetWordsFor(key: string, targetPages: number): number {
  if (key === 'TITLE') return TITLE_TARGET_WORDS;
  const total = targetPages * WORDS_PER_PAGE;
  const share = WORD_SHARE[key] ?? CUSTOM_SECTION_SHARE;
  return Math.max(MIN_TARGET_WORDS, Math.round(total * share));
}

/** Orders the project's sections for generation and assigns each its word target and output budget. */
export function planDraftSections(sections: { key: string; title: string; position: number }[], targetPages: number): PlannedSection[] {
  const rank = (key: string) => {
    const i = (SECTION_CALL_ORDER as readonly string[]).indexOf(key);
    return i === -1 ? SECTION_CALL_ORDER.length : i;
  };
  return [...sections]
    .sort((a, b) => rank(a.key) - rank(b.key) || a.position - b.position || a.key.localeCompare(b.key, 'en'))
    .map((s) => ({ key: s.key, title: s.title, targetWords: targetWordsFor(s.key, targetPages), maxTokens: sectionMaxTokens(s.key) }));
}
