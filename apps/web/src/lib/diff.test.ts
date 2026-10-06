import { describe, expect, it } from 'vitest';
import { diffWords } from './diff';

describe('diffWords', () => {
  it('marks added and removed words', () => {
    expect(diffWords('Panel ima ravne ivice.', 'Panel ima stepenaste ivice.')).toEqual([
      { kind: 'same', text: 'Panel ima ' },
      { kind: 'removed', text: 'ravne ' },
      { kind: 'added', text: 'stepenaste ' },
      { kind: 'same', text: 'ivice.' },
    ]);
  });

  it('restores both versions from the parts', () => {
    const before = 'Prva verzija opisa.\n\nDrugi pasus.';
    const after = 'Druga verzija opisa.\n\nDrugi pasus, dopunjen.';
    const parts = diffWords(before, after);
    expect(parts.filter((p) => p.kind !== 'added').map((p) => p.text).join('')).toBe(before);
    expect(parts.filter((p) => p.kind !== 'removed').map((p) => p.text).join('')).toBe(after);
  });

  it('handles empty versions', () => {
    expect(diffWords('', 'Novi tekst')).toEqual([{ kind: 'added', text: 'Novi tekst' }]);
    expect(diffWords('Stari', '')).toEqual([{ kind: 'removed', text: 'Stari' }]);
  });
});
