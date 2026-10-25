import { INTERVIEW_GROUPS } from '../domain/interview-groups';
import { listPlaceholders } from '../domain/answer-placeholders';
import { DEFAULT_QUESTIONS, DEFAULT_QUESTION_BANK_VERSION } from './default-questions';

/**
 * Content invariants of the question bank (FUZZ-143 / FUZZ-144). The bank is data written by
 * another agent; these tests are what keeps a future edition from silently breaking the
 * refresh of existing projects or the template markers the UI and the backend rely on.
 */
describe('default question bank', () => {
  /** Keys that existing projects already carry; a new edition must keep them or refresh-defaults duplicates the questions. */
  const FROZEN_KEYS = ['product-name', 'front-surface', 'edges-joints', 'dimensions', 'variants', 'designer', 'prior-disclosure'];

  it('loads the full A–G bank', () => {
    expect(DEFAULT_QUESTION_BANK_VERSION).toMatch(/^\d+\.\d+-\d{4}-\d{2}-\d{2}$/);
    expect(DEFAULT_QUESTIONS.length).toBeGreaterThanOrEqual(41);
    const groups = new Set(DEFAULT_QUESTIONS.map((q) => q.interviewGroup));
    for (const g of INTERVIEW_GROUPS) expect(groups.has(g.key)).toBe(true);
    expect(DEFAULT_QUESTIONS.every((q) => q.stepKey === 'PRODUCT_INTERVIEW')).toBe(true);
  });

  it('keeps the keys of the questions that existing projects already have', () => {
    const keys = DEFAULT_QUESTIONS.map((q) => q.defaultKey);
    for (const key of FROZEN_KEYS) expect(keys).toContain(key);
    expect(new Set(keys).size).toBe(keys.length);
    // Questions created before defaultKey existed are adopted by their original wording.
    for (const key of FROZEN_KEYS.filter((k) => k !== 'prior-disclosure')) {
      expect(DEFAULT_QUESTIONS.find((q) => q.defaultKey === key)?.legacyTexts.length).toBeGreaterThan(0);
    }
  });

  it('marks every group-G question (prior disclosure) as high priority and nothing else', () => {
    for (const q of DEFAULT_QUESTIONS) expect(q.highPriority).toBe(q.interviewGroup === 'G');
    expect(DEFAULT_QUESTIONS.filter((q) => q.interviewGroup === 'G').length).toBeGreaterThanOrEqual(4);
  });

  it('gives every question rich guidance: a template with recognised markers, include and avoid hints', () => {
    for (const q of DEFAULT_QUESTIONS) {
      expect(q.whyNeeded.length).toBeGreaterThan(20);
      expect(q.includeHints.length).toBeGreaterThan(0);
      expect(q.avoidHints.length).toBeGreaterThan(0);
      // Every `[…]` written in the template must be a marker the UI counter and the confirm guard recognise.
      const written = (q.exampleAnswer.match(/\[/g) ?? []).length;
      expect({ key: q.defaultKey, markers: listPlaceholders(q.exampleAnswer).length }).toEqual({ key: q.defaultKey, markers: written });
      expect(written).toBeGreaterThan(0);
    }
  });

  it('never calls the procedure patenting', () => {
    for (const q of DEFAULT_QUESTIONS) {
      const all = [q.text, q.whyNeeded, q.exampleAnswer, ...q.includeHints, ...q.avoidHints].join(' ').toLowerCase();
      expect(all).not.toContain('patentiranje');
    }
  });
});
