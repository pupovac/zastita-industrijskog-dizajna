import { countWords, estimatePages, WORDS_PER_PAGE } from './draft-length';

describe('draft length', () => {
  it('counts words separated by any whitespace, ignoring the ends', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n ')).toBe(0);
    expect(countWords('Panel pravougaonog oblika.')).toBe(3);
    expect(countWords('  Prikaz 1.1\n\npredstavlja  perspektivni\tprikaz. ')).toBe(5);
  });

  it('estimates pages at ~500 words per page, one decimal', () => {
    expect(WORDS_PER_PAGE).toBe(500);
    expect(estimatePages(0)).toBe(0);
    expect(estimatePages(250)).toBe(0.5);
    expect(estimatePages(2600)).toBe(5.2);
    expect(estimatePages(2649)).toBe(5.3);
  });
});
