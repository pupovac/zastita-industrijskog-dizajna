import { assertAnswerHasNoPlaceholders, countPlaceholders, listPlaceholders } from './answer-placeholders';

describe('answer placeholders', () => {
  it('counts [...] markers left from a template', () => {
    expect(countPlaceholders('Boja je [opisno: svetlosiva], zrno oko [1,5–2 mm].')).toBe(2);
    expect(listPlaceholders('Format [1000] × [500] mm')).toEqual(['[1000]', '[500]']);
  });

  it('ignores text without markers, empty brackets and brackets spanning lines', () => {
    expect(countPlaceholders('Mat, svetlosiva, zrno 2 mm.')).toBe(0);
    expect(countPlaceholders('prazno []')).toBe(0);
    expect(countPlaceholders('[prelazi\nred]')).toBe(0);
  });

  it('refuses confirmation while markers remain, allows it once they are filled', () => {
    expect(() => assertAnswerHasNoPlaceholders('Boja je [nijansa].')).toThrow(
      expect.objectContaining({ code: 'ANSWER_HAS_PLACEHOLDERS', kind: 'CONFLICT' }),
    );
    expect(() => assertAnswerHasNoPlaceholders('Boja je svetlosiva.')).not.toThrow();
  });
});
