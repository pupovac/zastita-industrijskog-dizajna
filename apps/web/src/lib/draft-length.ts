/**
 * Words and approximate A4 pages of a drafted text, as shown next to the AI draft.
 * Same arithmetic as the API (`domain/draft-length.ts`): ~500 words per page is an
 * orientation, not a rule.
 */
export const WORDS_PER_PAGE = 500;

export function countWords(text: string): number {
  const words = text.trim().match(/\S+/gu);
  return words ? words.length : 0;
}

export function estimatePages(words: number): number {
  return Math.round((words / WORDS_PER_PAGE) * 10) / 10;
}

export function formatPages(pages: number): string {
  return `${pages.toLocaleString('sr-Latn-RS', { maximumFractionDigits: 1 })} ${pages === 1 ? 'strana' : 'str.'}`;
}

/** Count of „[POTREBNA DOPUNA: …]" markers (the API counts the same way and blocks confirmation). */
export function countPlaceholders(text: string): number {
  return text.match(/\[\s*POTREBNA\s+DOPUNA\b[^\]]*\]/giu)?.length ?? 0;
}
