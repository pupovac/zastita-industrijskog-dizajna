/**
 * The two parts of the wizard. Drafting produces the description and the
 * representations up to their reviewed final version; filing collects what is
 * needed only to submit the application (fees, D-1 data, e-Prijava,
 * representative, priority claims...). Filing comes strictly after drafting.
 */
export type StepPhase = 'DRAFTING' | 'FILING';

/**
 * The 14 wizard steps in their mandatory order. `title` is the user-facing label.
 * Every drafting step precedes every filing step, so nothing that only serves
 * filing can hold up the drafting and review of the document.
 */
export const STEP_DEFINITIONS = [
  { key: 'PROJECT_SETUP', title: 'Podešavanje projekta', phase: 'DRAFTING' },
  { key: 'ZIS_RESEARCH', title: 'Istraživanje ZIS-a', phase: 'DRAFTING' },
  { key: 'REQUIREMENTS_SUMMARY', title: 'Sažetak zahteva', phase: 'DRAFTING' },
  { key: 'PRODUCT_INTERVIEW', title: 'Intervju o proizvodu i dizajnu', phase: 'DRAFTING' },
  { key: 'DOCUMENT_UPLOAD', title: 'Otpremanje postojeće dokumentacije', phase: 'DRAFTING' },
  { key: 'VISUAL_ANALYSIS', title: 'Analiza vizuelnih karakteristika', phase: 'DRAFTING' },
  { key: 'PRIOR_DESIGN_SEARCH', title: 'Pretraga postojećih dizajna', phase: 'DRAFTING' },
  { key: 'PROTECTION_STRATEGY', title: 'Strategija zaštite', phase: 'DRAFTING' },
  { key: 'REPRESENTATION_PLAN', title: 'Plan prikaza', phase: 'DRAFTING' },
  { key: 'DESCRIPTION_DRAFTING', title: 'Izrada opisa', phase: 'DRAFTING' },
  { key: 'INDEPENDENT_REVIEW', title: 'Nezavisna provera', phase: 'DRAFTING' },
  { key: 'D1_FORM_DATA', title: 'Podaci za D-1', phase: 'FILING' },
  { key: 'FINAL_PACKAGE', title: 'Finalni paket prijave', phase: 'FILING' },
  { key: 'FINAL_APPLICANT_REVIEW', title: 'Završni pregled podnosioca / zastupnika', phase: 'FILING' },
] as const satisfies readonly { key: string; title: string; phase: StepPhase }[];

export type StepKey = (typeof STEP_DEFINITIONS)[number]['key'];

export const STEP_KEYS: readonly StepKey[] = STEP_DEFINITIONS.map((s) => s.key);

/** Where items deferred to filing are collected; it opens the filing phase. */
export const FIRST_FILING_STEP: StepKey = 'D1_FORM_DATA';

export function isStepKey(value: string): value is StepKey {
  return (STEP_KEYS as readonly string[]).includes(value);
}

export function stepPosition(key: StepKey): number {
  return STEP_KEYS.indexOf(key) + 1;
}

export function stepTitle(key: StepKey): string {
  return STEP_DEFINITIONS[STEP_KEYS.indexOf(key)].title;
}

export function stepPhase(key: StepKey): StepPhase {
  return STEP_DEFINITIONS[STEP_KEYS.indexOf(key)].phase;
}

export function isFilingStep(key: string): boolean {
  return isStepKey(key) && stepPhase(key) === 'FILING';
}
