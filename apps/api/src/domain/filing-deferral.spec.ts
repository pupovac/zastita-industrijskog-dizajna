import { gatingStepKey, isDeferredToFiling } from './filing-deferral';
import { FIRST_FILING_STEP, STEP_DEFINITIONS, stepPhase } from './steps';

describe('step phases', () => {
  it('puts every drafting step before every filing step', () => {
    const phases = STEP_DEFINITIONS.map((s) => s.phase);
    const firstFiling = phases.indexOf('FILING');
    expect(firstFiling).toBeGreaterThan(0);
    expect(phases.slice(0, firstFiling).every((p) => p === 'DRAFTING')).toBe(true);
    expect(phases.slice(firstFiling).every((p) => p === 'FILING')).toBe(true);
    expect(STEP_DEFINITIONS[firstFiling].key).toBe(FIRST_FILING_STEP);
  });

  it('keeps D-1 data after the independent review and drafting up to the review', () => {
    const keys = STEP_DEFINITIONS.map((s) => s.key);
    expect(keys.indexOf('D1_FORM_DATA')).toBeGreaterThan(keys.indexOf('INDEPENDENT_REVIEW'));
    expect(stepPhase('PRODUCT_INTERVIEW')).toBe('DRAFTING');
    expect(stepPhase('DESCRIPTION_DRAFTING')).toBe('DRAFTING');
    expect(stepPhase('INDEPENDENT_REVIEW')).toBe('DRAFTING');
    expect(stepPhase('FINAL_PACKAGE')).toBe('FILING');
    expect(stepPhase('FINAL_APPLICANT_REVIEW')).toBe('FILING');
  });
});

describe('filing deferral', () => {
  it('treats explicitly deferred items and items of filing steps as deferred', () => {
    expect(isDeferredToFiling({ stepKey: 'PRODUCT_INTERVIEW', deferredToFiling: true })).toBe(true);
    expect(isDeferredToFiling({ stepKey: 'D1_FORM_DATA', deferredToFiling: false })).toBe(true);
    expect(isDeferredToFiling({ stepKey: 'FINAL_PACKAGE', deferredToFiling: false })).toBe(true);
    expect(isDeferredToFiling({ stepKey: 'PRODUCT_INTERVIEW', deferredToFiling: false })).toBe(false);
    expect(isDeferredToFiling({ stepKey: null, deferredToFiling: false })).toBe(false);
  });

  it('never lets a deferred item gate a drafting step', () => {
    expect(gatingStepKey({ stepKey: 'PRODUCT_INTERVIEW', deferredToFiling: true })).toBe('D1_FORM_DATA');
    expect(gatingStepKey({ stepKey: null, deferredToFiling: true })).toBe('D1_FORM_DATA');
    expect(gatingStepKey({ stepKey: 'FINAL_APPLICANT_REVIEW', deferredToFiling: false })).toBe('D1_FORM_DATA');
    expect(gatingStepKey({ stepKey: 'VISUAL_ANALYSIS', deferredToFiling: false })).toBe('VISUAL_ANALYSIS');
  });
});
