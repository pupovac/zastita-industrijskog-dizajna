import {
  classificationToKind,
  classifySource,
  parseResearchReport,
  parseSourceRecords,
  requirementStatus,
} from './research-docs';

const RECORDS = `# Zapisi izvora

## Z-01 — ZIS: Industrijski dizajn

\`\`\`
naziv: Industrijski dizajn
institucija: Zavod za intelektualnu svojinu Republike Srbije (ZIS)
URL: https://www.zis.gov.rs/prava/dizajn/
datum pristupa: 2026-10-06
izdvojeni zahtevi:
  - ČINJENICA (ZIS): uslovi su novost i individualni karakter.
  - AI ZAKLJUČAK: zastupnik nije obavezan za domaćeg podnosioca.
značaj za naš projekat: Glavni zvanični ulaz.
lokalna kopija: docs/izvori/web-snimci/zis-prava-dizajn.html ; tekst: docs/izvori/tekst/a.txt
\`\`\`

## Z-04 — Obrazac D-1

\`\`\`
naziv: Obrazac D-1
URL: https://www.zis.gov.rs/d1.docx
izdvojeni zahtevi (ČINJENICA — polja obrasca):
  1. Poslovno ime i sedište podnosioca
  - PRAVNI ZAHTEV (Uredba 43/2010, čl. 8 st. 3): zahtev se podnosi u dva primerka.
lokalna kopija: docs/izvori/dokumenti/D-1.docx
\`\`\`
`;

describe('source records parser', () => {
  const records = parseSourceRecords(RECORDS);

  it('reads every record with its fields and local copies', () => {
    expect(records.map((r) => r.code)).toEqual(['Z-01', 'Z-04']);
    expect(records[0].fields).toMatchObject({
      institucija: 'Zavod za intelektualnu svojinu Republike Srbije (ZIS)',
      URL: 'https://www.zis.gov.rs/prava/dizajn/',
      'datum pristupa': '2026-10-06',
      'značaj za naš projekat': 'Glavni zvanični ulaz.',
    });
    expect(records[0].localCopies).toEqual(['docs/izvori/web-snimci/zis-prava-dizajn.html', 'docs/izvori/tekst/a.txt']);
  });

  it('keeps the origin label of every extracted item', () => {
    expect(records[0].items).toEqual([
      { kind: 'FACT', text: 'ČINJENICA (ZIS): uslovi su novost i individualni karakter.' },
      { kind: 'AI_INFERENCE', text: 'AI ZAKLJUČAK: zastupnik nije obavezan za domaćeg podnosioca.' },
    ]);
    // Unlabeled lines inherit the label from the field heading.
    expect(records[1].items.map((i) => i.kind)).toEqual(['FACT', 'LEGAL_REQUIREMENT']);
  });
});

describe('matrix mapping', () => {
  it('maps classifications and statuses without loss', () => {
    expect(classificationToKind('PRAVNI ZAHTEV')).toBe('LEGAL_REQUIREMENT');
    expect(classificationToKind('ČINJENICA')).toBe('FACT');
    expect(classificationToKind('AI ZAKLJUČAK')).toBe('AI_INFERENCE');
    expect(classificationToKind('PREPORUKA')).toBe('RECOMMENDATION');
    expect(() => classificationToKind('NEŠTO')).toThrow();
    expect(requirementStatus('POTVRĐENO')).toBe('CONFIRMED');
    expect(requirementStatus('NEPROVERENO – potrebno potvrditi sa ZIS-om ili registrovanim zastupnikom.')).toBe('UNVERIFIED');
  });

  it('ranks sources by the project priority rule', () => {
    expect(classifySource('https://www.zis.gov.rs/prava/dizajn/', 'ZIS')).toEqual({ sourceType: 'ZIS', priority: 1 });
    expect(classifySource('https://www.paragraf.rs/propisi/zakon.html', 'Narodna skupština')).toEqual({
      sourceType: 'DOCUMENT',
      priority: 2,
    });
    expect(classifySource('https://locpub.wipo.int/enfr/', 'WIPO')).toEqual({ sourceType: 'WIPO', priority: 3 });
  });
});

describe('research report parser', () => {
  const report = parseResearchReport(`# Rezultati inicijalnog istraživanja

Uvodni tekst.

---

## A. Sažetak

### Šta je industrijski dizajn

Spoljašnji izgled proizvoda.

### Sledeći korak

Intervju.

---

## B. Obavezni elementi prijave

| a | b |
|---|---|
`);

  it('splits the summary into the §17 sections and keeps B–N whole', () => {
    expect(report.map((s) => [s.code, s.heading])).toEqual([
      ['INTRO', 'Uvod'],
      ['A.1', 'Šta je industrijski dizajn'],
      ['A.2', 'Sledeći korak'],
      ['B', 'Obavezni elementi prijave'],
    ]);
    expect(report[1].body).toBe('Spoljašnji izgled proizvoda.');
    expect(report[2].body).toBe('Intervju.');
  });
});
