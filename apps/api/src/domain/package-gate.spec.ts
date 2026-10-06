import { DomainError } from './domain-error';
import { ChecklistItem } from './filing-checklist';
import { planPackageGeneration } from './package-gate';
import { findPatentTerms } from './patent-terms';

const done: ChecklistItem[] = [{ key: 'X', label: 'Stavka', done: true, detail: '' }];
const base = { openBlockers: 0, terminology: [], checklist: done, unconfirmedSections: [], missingD1Fields: [] };

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return (e as DomainError).code;
  }
  return undefined;
}

describe('planPackageGeneration', () => {
  it('refuses to generate while a BLOCKER is unresolved', () => {
    expect(code(() => planPackageGeneration({ ...base, openBlockers: 1 }))).toBe('FINAL_PACKAGE_BLOCKED_BY_BLOCKER');
  });

  it('refuses to generate a description with patent terminology', () => {
    const terminology = [{ sectionTitle: 'Opis', matches: findPatentTerms('Predmet pronalaska je panel.') }];
    expect(code(() => planPackageGeneration({ ...base, terminology }))).toBe('PATENT_TERMINOLOGY_IN_DRAFT');
  });

  it('generates a final version only when everything is confirmed', () => {
    expect(planPackageGeneration(base)).toEqual({ isFinal: true, missing: [] });
  });

  it('generates a draft and lists what is missing otherwise', () => {
    const result = planPackageGeneration({
      ...base,
      checklist: [{ key: 'AUTHOR', label: 'Autor je utvrđen', done: false, detail: '' }],
      unconfirmedSections: ['Opis industrijskog dizajna'],
      missingD1Fields: ['3'],
    });
    expect(result.isFinal).toBe(false);
    expect(result.missing).toEqual([
      'Kontrolna tačka: Autor je utvrđen',
      'Sekcija opisa nije potvrđena: Opis industrijskog dizajna',
      'D-1 polje nije popunjeno: 3',
    ]);
  });
});
