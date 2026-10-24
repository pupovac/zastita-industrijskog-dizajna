import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findPatentTerms } from './patent-terms';
import { isAllowedTarget, STEP_GUIDES, stepGuide } from './step-guides';
import { STEP_KEYS } from './steps';

const matrix = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', '..', 'docs', 'faza-2', 'matrica-zahteva-zis.json'), 'utf8'),
) as { areas: { code: string }[]; phases: { number: number }[] };

describe('step guides for the AI review', () => {
  it('describes every one of the 14 steps exactly once, in order', () => {
    expect(STEP_GUIDES.map((g) => g.key)).toEqual(STEP_KEYS);
    for (const guide of STEP_GUIDES) {
      expect(guide.description.length).toBeGreaterThan(40);
      expect(guide.closingCriterion.length).toBeGreaterThan(20);
      expect(guide.targets.length).toBeGreaterThan(0);
    }
  });

  it('only refers to matrix areas and research phases that exist', () => {
    const areas = new Set(matrix.areas.map((a) => a.code));
    const phases = new Set(matrix.phases.map((p) => p.number));
    for (const guide of STEP_GUIDES) {
      for (const code of guide.areaCodes) expect(areas.has(code)).toBe(true);
      for (const phase of guide.researchPhases) expect(phases.has(phase)).toBe(true);
    }
  });

  it('never uses patent terminology in the step texts', () => {
    for (const guide of STEP_GUIDES) {
      expect(findPatentTerms(`${guide.description}\n${guide.closingCriterion}`)).toEqual([]);
      expect(guide.description + guide.closingCriterion).not.toMatch(/patentiranj/iu);
    }
  });

  it('lets the AI propose only listed targets, and new records only where allowed', () => {
    const setup = stepGuide('PROJECT_SETUP');
    expect(isAllowedTarget(setup, 'Project', 'applicantAddress', false)).toBe(true);
    expect(isAllowedTarget(setup, 'Project', 'isDemo', false)).toBe(false);
    const visual = stepGuide('VISUAL_ANALYSIS');
    expect(isAllowedTarget(visual, 'DesignFeature', 'category', true)).toBe(true);
    expect(isAllowedTarget(visual, 'DesignFeature', 'name', false)).toBe(true);
    expect(isAllowedTarget(visual, 'DesignFeature', 'verified', true)).toBe(false);
    expect(isAllowedTarget(visual, 'D1FieldValue', 'APPLICANT', false)).toBe(false);
    const search = stepGuide('PRIOR_DESIGN_SEARCH');
    expect(isAllowedTarget(search, 'PriorDesign', 'similarityNotes', false)).toBe(false);
    expect(isAllowedTarget(search, 'PriorDesign', 'similarityNotes', true)).toBe(true);
    // Every step lets the AI ask the user something.
    for (const guide of STEP_GUIDES) expect(isAllowedTarget(guide, 'OpenQuestion', 'text', false)).toBe(true);
  });
});
