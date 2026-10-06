/**
 * Patent terminology that does not belong in an industrial design application
 * (§3, Agent 6). The check covers Serbian inflected forms. It flags text for the
 * user and the reviewer; it does not rewrite anything.
 */

const L = '\\p{L}*';
const START = '(?<!\\p{L})';

interface TermRule {
  /** Canonical form shown to the user. */
  term: string;
  pattern: RegExp;
}

// Multi-word phrases come first so that "realizacija pronalaska" is reported as one finding.
const RULES: TermRule[] = [
  { term: 'realizacija pronalaska', pattern: new RegExp(`${START}realizacij${L}\\s+pronala[sz]k${L}`, 'giu') },
  {
    term: ['patentiranje', 'industrijskog', 'dizajna'].join(' '),
    pattern: new RegExp(`${START}patentiranj${L}\\s+industrijsk${L}\\s+dizajn${L}`, 'giu'),
  },
  { term: 'patentni zahtev', pattern: new RegExp(`${START}patentn${L}\\s+zahtev${L}`, 'giu') },
  { term: 'tehnički problem', pattern: new RegExp(`${START}tehni[čc]k${L}\\s+problem${L}`, 'giu') },
  { term: 'tehnički efekat', pattern: new RegExp(`${START}tehni[čc]k${L}\\s+efek(?:at|t${L})`, 'giu') },
  { term: 'inventivni nivo', pattern: new RegExp(`${START}inventivn${L}\\s+nivo${L}`, 'giu') },
  // Noun forms only: the verb "pronalazi" (finds) is ordinary Serbian and is not flagged.
  {
    term: 'pronalazak',
    pattern: new RegExp(`${START}(?:pronalazak|pronalazač${L}|pronalask(?:a|u|om)|pronalasci|pronalazaka)(?!\\p{L})`, 'giu'),
  },
];

export interface PatentTermMatch {
  term: string;
  match: string;
  index: number;
}

export function findPatentTerms(text: string): PatentTermMatch[] {
  const found: PatentTermMatch[] = [];
  const covered: [number, number][] = [];
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.pattern)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (covered.some(([a, b]) => start < b && end > a)) continue;
      covered.push([start, end]);
      found.push({ term: rule.term, match: m[0], index: start });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}
