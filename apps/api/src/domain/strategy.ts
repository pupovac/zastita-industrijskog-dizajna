import { StrategyItemKey } from '@prisma/client';
import { DomainError } from './domain-error';

/** Step 8 decisions. Each value is recorded with its rationale and matrix references (MZ-xxx). */
export const STRATEGY_ITEMS: { key: StrategyItemKey; title: string; values: string[] | null }[] = [
  { key: 'FILING_TYPE', title: 'Vrsta prijave', values: ['SINGLE', 'SEPARATE', 'MULTIPLE'] },
  { key: 'VARIANT_RESOLUTION', title: 'Razrešenje varijanti', values: null },
  { key: 'DEFERRED_PUBLICATION', title: 'Odloženo objavljivanje', values: ['YES', 'NO'] },
  { key: 'PRIORITY_CLAIM', title: 'Pravo prvenstva', values: ['YES', 'NO'] },
];

export function assertValidStrategyValue(key: StrategyItemKey, value: string): void {
  const item = STRATEGY_ITEMS.find((i) => i.key === key);
  if (item?.values && value !== '' && !item.values.includes(value)) {
    throw new DomainError('INVALID_STRATEGY_VALUE', `Nedozvoljena vrednost za „${item.title}".`);
  }
}

/** Matrix references are written as "MZ-120, NS-03"; anything else is rejected. */
export function parseRequirementRefs(refs: string): string[] {
  const codes = refs
    .split(/[,;\s]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const invalid = codes.filter((c) => !/^(MZ|NS)-\d{2,3}$/.test(c));
  if (invalid.length > 0) {
    throw new DomainError('INVALID_REQUIREMENT_REF', `Neispravna oznaka iz Matrice zahteva: ${invalid.join(', ')}.`);
  }
  return codes;
}
