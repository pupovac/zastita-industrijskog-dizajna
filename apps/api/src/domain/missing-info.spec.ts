import { computeMissingInfo, MissingInfoInput } from './missing-info';

const empty: MissingInfoInput = {
  project: { productName: 'Panel', applicantName: 'Firma d.o.o.', designerName: 'Autor' },
  questions: [],
  facts: [],
  openQuestions: [],
  reviewIssues: [],
  files: [],
};

describe('computeMissingInfo', () => {
  it('is empty for a complete project', () => {
    expect(computeMissingInfo(empty)).toEqual([]);
  });

  it('lists empty project fields and unanswered required questions', () => {
    const items = computeMissingInfo({
      ...empty,
      project: { productName: ' ', applicantName: 'X', designerName: '' },
      questions: [
        { id: 'q1', text: 'Obavezno', stepKey: 'PRODUCT_INTERVIEW', required: true, deferredToFiling: false, answerValue: '  ' },
        { id: 'q2', text: 'Opciono', stepKey: 'PRODUCT_INTERVIEW', required: false, deferredToFiling: false, answerValue: null },
        { id: 'q3', text: 'Odgovoreno', stepKey: 'PRODUCT_INTERVIEW', required: true, deferredToFiling: false, answerValue: 'da' },
      ],
    });
    expect(items.map((i) => i.refId)).toEqual(['productName', 'designerName', 'q1']);
  });

  it('lists unconfirmed information but not recommendations', () => {
    const items = computeMissingInfo({
      ...empty,
      facts: [
        { id: 'f1', statement: 'Zaključak', kind: 'AI_INFERENCE', verified: false },
        { id: 'f2', statement: 'Preporuka', kind: 'RECOMMENDATION', verified: false },
        { id: 'f3', statement: 'Potvrđeno', kind: 'FACT', verified: true },
      ],
    });
    expect(items.map((i) => i.refId)).toEqual(['f1']);
  });

  it('puts blocking items (open conflicts, blocking questions) first', () => {
    const items = computeMissingInfo({
      ...empty,
      openQuestions: [
        { id: 'o1', text: 'Neblokirajuće', stepKey: null, blocking: false, deferredToFiling: false, status: 'OPEN' },
        { id: 'o2', text: 'Blokirajuće', stepKey: 'ZIS_RESEARCH', blocking: true, deferredToFiling: false, status: 'OPEN' },
        { id: 'o3', text: 'Odgovoreno', stepKey: null, blocking: true, deferredToFiling: false, status: 'ANSWERED' },
      ],
      reviewIssues: [
        { id: 'c1', title: 'Neslaganje', stepKey: 'DOCUMENT_UPLOAD', type: 'CONFLICT', status: 'OPEN' },
        { id: 'c2', title: 'Rešeno', stepKey: 'DOCUMENT_UPLOAD', type: 'CONFLICT', status: 'RESOLVED' },
      ],
      files: [{ id: 'd1', originalName: 'scan.pdf', extractionStatus: 'FAILED' }],
    });
    expect(items.map((i) => [i.refId, i.blocking])).toEqual([
      ['o2', true],
      ['c1', true],
      ['o1', false],
      ['d1', false],
    ]);
  });

  it('lists items deferred to filing last and never as blocking', () => {
    const items = computeMissingInfo({
      ...empty,
      questions: [
        { id: 'q1', text: 'Taksa', stepKey: 'PRODUCT_INTERVIEW', required: true, deferredToFiling: true, answerValue: null },
        { id: 'q2', text: 'D-1', stepKey: 'D1_FORM_DATA', required: false, deferredToFiling: false, answerValue: '' },
        { id: 'q3', text: 'Ivice', stepKey: 'PRODUCT_INTERVIEW', required: true, deferredToFiling: false, answerValue: null },
        { id: 'q4', text: 'Odgovoreno', stepKey: 'D1_FORM_DATA', required: true, deferredToFiling: true, answerValue: 'da' },
      ],
      openQuestions: [
        { id: 'o1', text: 'Zastupnik', stepKey: 'PRODUCT_INTERVIEW', blocking: true, deferredToFiling: true, status: 'OPEN' },
        { id: 'o2', text: 'Profil', stepKey: 'VISUAL_ANALYSIS', blocking: true, deferredToFiling: false, status: 'OPEN' },
      ],
    });
    expect(items.map((i) => [i.refId, i.type, i.blocking])).toEqual([
      ['o2', 'OPEN_QUESTION', true],
      ['q3', 'REQUIRED_QUESTION', false],
      ['q1', 'DEFERRED_TO_FILING', false],
      ['q2', 'DEFERRED_TO_FILING', false],
      ['o1', 'DEFERRED_TO_FILING', false],
    ]);
    expect(items.filter((i) => i.type === 'DEFERRED_TO_FILING').every((i) => i.stepKey === 'D1_FORM_DATA')).toBe(true);
  });

  it('keeps applicant and designer as non-blocking project fields', () => {
    const items = computeMissingInfo({ ...empty, project: { productName: 'Panel', applicantName: '', designerName: '' } });
    expect(items.map((i) => [i.refId, i.blocking])).toEqual([
      ['applicantName', false],
      ['designerName', false],
    ]);
  });
});
