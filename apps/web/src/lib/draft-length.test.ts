import { describe, expect, it } from 'vitest';
import { countPlaceholders, countWords, estimatePages, formatPages } from './draft-length';

describe('draft length helpers', () => {
  it('counts words and estimates pages at ~500 words per page', () => {
    expect(countWords('')).toBe(0);
    expect(countWords(' Panel  pravougaonog\noblika. ')).toBe(3);
    expect(estimatePages(0)).toBe(0);
    expect(estimatePages(1250)).toBe(2.5);
    expect(formatPages(2.5)).toBe('2,5 str.');
    expect(formatPages(1)).toBe('1 strana');
  });

  it('counts „[POTREBNA DOPUNA]" markers like the API', () => {
    expect(countPlaceholders('Panel [POTREBNA DOPUNA: boja] i [potrebna dopuna].')).toBe(2);
    expect(countPlaceholders('Bez markera.')).toBe(0);
  });
});
