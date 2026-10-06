import { STEP_KEYS } from './steps';
import { ChecklistInput, evaluateChecklist } from './filing-checklist';

const allApproved = STEP_KEYS.map((stepKey) => ({ stepKey, status: 'APPROVED' as const }));

function complete(): ChecklistInput {
  return {
    steps: allApproved,
    sourceCodes: ['Z-04', 'Z-05'],
    feeRequirementCount: 3,
    project: { applicantName: 'Firma d.o.o.', designerName: 'Petar Petrović' },
    d1: [
      { fieldKey: 'APPLICANT', value: 'Firma d.o.o., Beograd' },
      { fieldKey: 'LEGAL_BASIS', value: 'Ugovor o radu' },
      { fieldKey: 'PRODUCT_TITLE', value: 'Fasadni panel' },
      { fieldKey: 'FEES', value: 'Jedan predmet' },
      { fieldKey: 'ATTACHMENTS', value: 'Dva primerka prikaza; dva primerka opisa' },
    ],
    sections: ['TITLE', 'DESCRIPTION', 'ATTACHMENT_LIST'].map((key) => ({ key, confirmed: true })),
    representations: [{ requirement: 'MANDATORY', hasFile: true, assessment: 'ACCEPTABLE' }],
    openConflicts: 0,
    openConsistencyFindings: 0,
    openDescriptionFindings: 0,
    features: [{ functionalityRisk: 'NEEDS_FURTHER_REVIEW' }],
    searchCoverage: [{ database: 'ZIS — baza industrijskih dizajna', status: 'COMPLETED' }],
    priorDisclosureQuestions: [{ answered: true }],
    openBlockers: 0,
  };
}

const status = (input: ChecklistInput) => Object.fromEntries(evaluateChecklist(input).map((i) => [i.key, i.done]));

describe('filing checklist (§16)', () => {
  it('has the 16 checkpoints in order', () => {
    const items = evaluateChecklist(complete());
    expect(items).toHaveLength(16);
    expect(items[0].label).toBe('Pregledana su aktuelna zvanična ZIS uputstva');
    expect(items[15].label).toBe('Nema BLOCKER problema');
    expect(items.every((i) => i.done)).toBe(true);
  });

  it('is derived from the project state', () => {
    const input = complete();
    input.openBlockers = 1;
    input.priorDisclosureQuestions = [{ answered: true }, { answered: false }];
    input.representations = [{ requirement: 'MANDATORY', hasFile: true, assessment: 'NEEDS_REWORK' }];
    input.searchCoverage = [{ database: 'DesignView', status: 'BLOCKED' }];
    input.features = [{ functionalityRisk: null }];
    const s = status(input);
    expect(s.NO_BLOCKERS).toBe(false);
    expect(s.PRIOR_DISCLOSURE).toBe(false);
    expect(s.REPRESENTATIONS_FINAL).toBe(false);
    expect(s.PRIOR_SEARCH).toBe(false);
    expect(s.TECHNICAL_FUNCTION).toBe(false);
    expect(s.APPLICANT).toBe(true);
  });

  it('requires the ZIS database search; other databases may be skipped', () => {
    const input = complete();
    input.searchCoverage = [
      { database: 'ZIS — baza industrijskih dizajna', status: 'PARTIAL' },
      { database: 'DesignView', status: 'SKIPPED' },
    ];
    expect(status(input).PRIOR_SEARCH).toBe(true);
    input.searchCoverage = [{ database: 'ZIS', status: 'SKIPPED' }];
    expect(status(input).PRIOR_SEARCH).toBe(false);
  });

  it('needs the legal basis only when the author is not the applicant', () => {
    const input = complete();
    input.d1 = input.d1.filter((f) => f.fieldKey !== 'LEGAL_BASIS');
    expect(status(input).LEGAL_BASIS).toBe(false);
    input.project = { applicantName: 'Petar Petrović', designerName: 'petar petrović' };
    expect(status(input).LEGAL_BASIS).toBe(true);
  });

  it('counts open reviewer findings against "same design" and "description matches"', () => {
    const input = complete();
    input.openConsistencyFindings = 1;
    input.openDescriptionFindings = 1;
    const s = status(input);
    expect(s.SAME_DESIGN).toBe(false);
    expect(s.DESCRIPTION_MATCHES).toBe(false);
  });

  it('does not count a step that is only in review as done', () => {
    const input = complete();
    input.steps = allApproved.map((s) => (s.stepKey === 'INDEPENDENT_REVIEW' ? { ...s, status: 'READY_FOR_REVIEW' as const } : s));
    expect(status(input).INDEPENDENT_REVIEW).toBe(false);
  });

  it('starts empty for a new project', () => {
    const items = evaluateChecklist({
      steps: STEP_KEYS.map((stepKey) => ({ stepKey, status: 'NOT_STARTED' as const })),
      sourceCodes: [],
      feeRequirementCount: 0,
      project: { applicantName: '', designerName: '' },
      d1: [],
      sections: [],
      representations: [],
      openConflicts: 0,
      openConsistencyFindings: 0,
      openDescriptionFindings: 0,
      features: [],
      searchCoverage: [],
      priorDisclosureQuestions: [],
      openBlockers: 0,
    });
    expect(items.filter((i) => i.done).map((i) => i.key)).toEqual(['NO_BLOCKERS']);
  });
});
