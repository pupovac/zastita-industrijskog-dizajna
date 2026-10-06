import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
  it('reads the block types used in the research documents', () => {
    const blocks = parseMarkdown(
      [
        '### Pravila',
        '',
        'Prvi red',
        'nastavak pasusa.',
        '',
        '- stavka 1',
        '- stavka 2',
        '  nastavak stavke',
        '',
        '| Polje | Vrednost |',
        '|---|---|',
        '| 1 | Podnosilac \\| adresa |',
        '',
        '> Napomena',
      ].join('\n'),
    );
    expect(blocks).toEqual([
      { type: 'heading', level: 3, text: 'Pravila' },
      { type: 'paragraph', text: 'Prvi red nastavak pasusa.' },
      { type: 'list', ordered: false, items: ['stavka 1', 'stavka 2 nastavak stavke'] },
      { type: 'table', header: ['Polje', 'Vrednost'], rows: [['1', 'Podnosilac | adresa']] },
      { type: 'quote', text: 'Napomena' },
    ]);
  });
});

describe('parseInline', () => {
  it('finds bold, code and matrix references', () => {
    expect(parseInline('**Važno**: `ČINJENICA` [MZ-001, NS-02].')).toEqual([
      { kind: 'strong', text: 'Važno' },
      { kind: 'text', text: ': ' },
      { kind: 'code', text: 'ČINJENICA' },
      { kind: 'text', text: ' ' },
      { kind: 'ref', text: 'MZ-001, NS-02' },
      { kind: 'text', text: '.' },
    ]);
  });
});
