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
        { id: 'q1', text: 'Obavezno', stepKey: 'PRODUCT_INTERVIEW', required: true, answerValue: '  ' },
        { id: 'q2', text: 'Opciono', stepKey: 'PRODUCT_INTERVIEW', required: false, answerValue: null },
        { id: 'q3', text: 'Odgovoreno', stepKey: 'PRODUCT_INTERVIEW', required: true, answerValue: 'da' },
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
        { id: 'o1', text: 'Neblokirajuće', stepKey: null, blocking: false, status: 'OPEN' },
        { id: 'o2', text: 'Blokirajuće', stepKey: 'ZIS_RESEARCH', blocking: true, status: 'OPEN' },
        { id: 'o3', text: 'Odgovoreno', stepKey: null, blocking: true, status: 'ANSWERED' },
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
});
