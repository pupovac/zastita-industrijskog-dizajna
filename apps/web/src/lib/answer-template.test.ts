import { describe, expect, it } from 'vitest';
import {
  applyTemplate,
  countPlaceholders,
  firstPlaceholder,
  isHintCovered,
  lengthAdvice,
  missingHints,
  placeholderLabel,
  splitPlaceholders,
  wordCount,
} from './answer-template';

const TEMPLATE = 'Tekstura je [zrnasta / glatka], krupnoće zrna oko [1,5–2 mm]. Boja je [nijansa].';

describe('„Koristi kao šablon"', () => {
  it('copies the example into an empty answer field', () => {
    expect(applyTemplate('', TEMPLATE)).toEqual({ value: TEMPLATE, needsConfirmation: false });
    expect(applyTemplate('   \n', TEMPLATE)).toEqual({ value: TEMPLATE, needsConfirmation: false });
  });

  it('asks before replacing an answer the user already wrote, and replaces only when confirmed', () => {
    expect(applyTemplate('Moj tekst', TEMPLATE)).toEqual({ value: 'Moj tekst', needsConfirmation: true });
    expect(applyTemplate('Moj tekst', TEMPLATE, true)).toEqual({ value: TEMPLATE, needsConfirmation: false });
  });

  it('puts the cursor on the first marker', () => {
    expect(firstPlaceholder(TEMPLATE)).toEqual({ start: 12, end: 30 });
    expect(TEMPLATE.slice(12, 30)).toBe('[zrnasta / glatka]');
    expect(firstPlaceholder('bez oznaka')).toBeNull();
  });
});

describe('brojač oznaka', () => {
  it('counts markers that are still unfilled', () => {
    expect(countPlaceholders(TEMPLATE)).toBe(3);
    expect(countPlaceholders('Tekstura je zrnasta, zrno oko 2 mm. Boja je svetlosiva.')).toBe(0);
    expect(countPlaceholders('[]')).toBe(0);
  });

  it('labels the counter in Serbian plural forms', () => {
    expect(placeholderLabel(1)).toBe('Popunite 1 oznaku');
    expect(placeholderLabel(3)).toBe('Popunite 3 oznake');
    expect(placeholderLabel(7)).toBe('Popunite 7 oznaka');
  });

  it('splits text so markers can be highlighted', () => {
    expect(splitPlaceholders('Boja je [nijansa].')).toEqual([
      { text: 'Boja je ', placeholder: false },
      { text: '[nijansa]', placeholder: true },
      { text: '.', placeholder: false },
    ]);
  });
});

describe('indikator obima odgovora', () => {
  const hints = ['Vrsta teksture i njena krupnoća (zrno u mm ili opisno)', 'Sjaj: mat, polumat ili sjajan', 'Boja opisno (nijansa)'];

  it('counts words', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('  jedna  dva\ntri ')).toBe(3);
  });

  it('matches hints by keyword stems, so inflected forms count', () => {
    expect(isHintCovered('Teksture su zrnaste.', hints[0])).toBe(true);
    expect(isHintCovered('Površina je mat.', hints[1])).toBe(true);
    expect(isHintCovered('Površina je ravna.', hints[2])).toBe(false);
    expect(missingHints('Tekstura je zrnasta, mat.', hints)).toEqual(['Boja opisno (nijansa)']);
  });

  it('suggests what to add to a short answer, says nothing when everything is covered', () => {
    expect(lengthAdvice('', hints)).toBeNull();
    expect(lengthAdvice('Zrnasta tekstura.', hints)).toBe('Kratak odgovor, dodajte detalje o: sjaj: mat, polumat ili sjajan; boja opisno.');
    const full =
      'Prednja površina je ravna i u celini prekrivena završnim slojem. Tekstura je zrnasta, krupnoće zrna oko 2 mm, ujednačena po celoj površini. Sjaj je mat. Boja je svetlosiva, ujednačena, bez dezena.';
    expect(lengthAdvice(full, hints)).toBeNull();
  });
});
