import { FIRST_FILING_STEP, isFilingStep } from './steps';

/** A question or open question that may be needed only for filing ("ODLOŽENO ZA PODNOŠENJE"). */
export interface DeferrableItem {
  stepKey: string | null;
  deferredToFiling: boolean;
}

/** Explicitly deferred, or attached to a filing step. */
export function isDeferredToFiling(item: DeferrableItem): boolean {
  return item.deferredToFiling || (item.stepKey !== null && isFilingStep(item.stepKey));
}

/**
 * The step whose review an item can hold up. Items deferred to filing count only
 * against the first filing step, so they never block any drafting step, whatever
 * step they were originally asked in.
 */
export function gatingStepKey(item: DeferrableItem): string | null {
  return isDeferredToFiling(item) ? FIRST_FILING_STEP : item.stepKey;
}
