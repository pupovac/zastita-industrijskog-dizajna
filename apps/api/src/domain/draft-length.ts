/**
 * Length of a drafted text, as the user sees it: words and approximate A4 pages.
 * ~500 words per page is the orientation the AI draft prompt uses (FUZZ-142); it is a
 * guide, not a rule — the draft aims at the target through detail, not repetition.
 * The web client has the same arithmetic in `lib/draft-length.ts`.
 */
export const WORDS_PER_PAGE = 500;

export function countWords(text: string): number {
  const words = text.trim().match(/\S+/gu);
  return words ? words.length : 0;
}

/** Pages rounded to one decimal; 0 for an empty text. */
export function estimatePages(words: number): number {
  return Math.round((words / WORDS_PER_PAGE) * 10) / 10;
}
