/**
 * The 14 wizard steps in their mandatory order. `title` is the user-facing label.
 */
export const STEP_DEFINITIONS = [
  { key: 'PROJECT_SETUP', title: 'Podešavanje projekta' },
  { key: 'ZIS_RESEARCH', title: 'Istraživanje ZIS-a' },
  { key: 'REQUIREMENTS_SUMMARY', title: 'Sažetak zahteva' },
  { key: 'PRODUCT_INTERVIEW', title: 'Intervju o proizvodu i dizajnu' },
  { key: 'DOCUMENT_UPLOAD', title: 'Otpremanje postojeće dokumentacije' },
  { key: 'VISUAL_ANALYSIS', title: 'Analiza vizuelnih karakteristika' },
  { key: 'PRIOR_DESIGN_SEARCH', title: 'Pretraga postojećih dizajna' },
  { key: 'PROTECTION_STRATEGY', title: 'Strategija zaštite' },
  { key: 'REPRESENTATION_PLAN', title: 'Plan prikaza' },
  { key: 'DESCRIPTION_DRAFTING', title: 'Izrada opisa' },
  { key: 'D1_FORM_DATA', title: 'Podaci za D-1' },
  { key: 'INDEPENDENT_REVIEW', title: 'Nezavisna provera' },
  { key: 'FINAL_PACKAGE', title: 'Finalni paket prijave' },
  { key: 'FINAL_APPLICANT_REVIEW', title: 'Završni pregled podnosioca / zastupnika' },
] as const;

export type StepKey = (typeof STEP_DEFINITIONS)[number]['key'];

export const STEP_KEYS: readonly StepKey[] = STEP_DEFINITIONS.map((s) => s.key);

export function isStepKey(value: string): value is StepKey {
  return (STEP_KEYS as readonly string[]).includes(value);
}

export function stepPosition(key: StepKey): number {
  return STEP_KEYS.indexOf(key) + 1;
}

export function stepTitle(key: StepKey): string {
  return STEP_DEFINITIONS[STEP_KEYS.indexOf(key)].title;
}
