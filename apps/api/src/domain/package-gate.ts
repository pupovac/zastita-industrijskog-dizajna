import { DomainError } from './domain-error';
import { ChecklistItem } from './filing-checklist';
import { PatentTermMatch } from './patent-terms';

export interface PackageGateInput {
  openBlockers: number;
  /** Patent terms found in the latest version of each description section. */
  terminology: { sectionTitle: string; matches: PatentTermMatch[] }[];
  checklist: ChecklistItem[];
  /** Required description sections that are empty or not confirmed by the user. */
  unconfirmedSections: string[];
  /** D-1 fields that are required and still empty. */
  missingD1Fields: string[];
}

export interface PackageGateResult {
  /** A final version only when all mandatory data is confirmed; otherwise a draft (NACRT). */
  isFinal: boolean;
  missing: string[];
}

/**
 * Decides whether the final package may be generated and whether it is final.
 * - An unresolved BLOCKER stops generation altogether (the same rule blocks step 13).
 * - Patent terminology in the description stops generation: the text must be fixed first.
 * - Otherwise the package is generated; it is final only when every checklist item is
 *   done, every required section is confirmed and every required D-1 field is filled.
 */
export function planPackageGeneration(input: PackageGateInput): PackageGateResult {
  if (input.openBlockers > 0) {
    throw new DomainError(
      'FINAL_PACKAGE_BLOCKED_BY_BLOCKER',
      'Finalni paket se ne može generisati dok postoji nerešen nalaz BLOCKER.',
      'CONFLICT',
    );
  }
  const withTerms = input.terminology.filter((t) => t.matches.length > 0);
  if (withTerms.length > 0) {
    const list = withTerms.map((t) => `${t.sectionTitle}: ${[...new Set(t.matches.map((m) => m.term))].join(', ')}`);
    throw new DomainError(
      'PATENT_TERMINOLOGY_IN_DRAFT',
      `Opis sadrži patentnu terminologiju (${list.join('; ')}). Ispravite tekst pre generisanja paketa.`,
      'CONFLICT',
    );
  }
  const missing = [
    ...input.checklist.filter((i) => !i.done).map((i) => `Kontrolna tačka: ${i.label}`),
    ...input.unconfirmedSections.map((s) => `Sekcija opisa nije potvrđena: ${s}`),
    ...input.missingD1Fields.map((f) => `D-1 polje nije popunjeno: ${f}`),
  ];
  return { isFinal: missing.length === 0, missing };
}
