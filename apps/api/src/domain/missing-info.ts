import { ExtractionStatus, InformationKind, OpenQuestionStatus, ReviewIssueStatus, ReviewIssueType } from '@prisma/client';
import { isDeferredToFiling } from './filing-deferral';
import { FIRST_FILING_STEP, StepKey } from './steps';

export interface MissingInfoInput {
  project: { productName: string; applicantName: string; designerName: string };
  questions: {
    id: string;
    text: string;
    stepKey: string;
    required: boolean;
    deferredToFiling: boolean;
    answerValue: string | null;
  }[];
  facts: { id: string; statement: string; kind: InformationKind; verified: boolean }[];
  openQuestions: {
    id: string;
    text: string;
    stepKey: string | null;
    blocking: boolean;
    deferredToFiling: boolean;
    status: OpenQuestionStatus;
  }[];
  reviewIssues: { id: string; title: string; stepKey: string | null; type: ReviewIssueType; status: ReviewIssueStatus }[];
  files: { id: string; originalName: string; extractionStatus: ExtractionStatus }[];
}

export type MissingInfoType =
  | 'PROJECT_FIELD'
  | 'REQUIRED_QUESTION'
  | 'UNCONFIRMED_INFORMATION'
  | 'OPEN_QUESTION'
  | 'CONFLICT'
  | 'DOCUMENT_NEEDS_MANUAL_REVIEW'
  /** Needed only for filing; never blocks drafting. */
  | 'DEFERRED_TO_FILING';

export interface MissingInfoItem {
  type: MissingInfoType;
  label: string;
  stepKey: StepKey | string | null;
  refId: string | null;
  blocking: boolean;
}

const PROJECT_FIELDS: { field: keyof MissingInfoInput['project']; label: string }[] = [
  { field: 'productName', label: 'Naziv proizvoda' },
  { field: 'applicantName', label: 'Podnosilac' },
  { field: 'designerName', label: 'Autor / dizajner' },
];

/**
 * What the right-hand panel lists as still missing. Blocking items come first,
 * items deferred to filing last. Deferred items are never blocking here: they can
 * only hold up the filing phase (see `gatingStepKey`).
 */
export function computeMissingInfo(input: MissingInfoInput): MissingInfoItem[] {
  const items: MissingInfoItem[] = [];
  const deferred: MissingInfoItem[] = [];
  const deferredItem = (label: string, refId: string): MissingInfoItem => ({
    type: 'DEFERRED_TO_FILING',
    label,
    stepKey: FIRST_FILING_STEP,
    refId,
    blocking: false,
  });

  for (const { field, label } of PROJECT_FIELDS) {
    if (!input.project[field].trim()) {
      items.push({ type: 'PROJECT_FIELD', label, stepKey: 'PROJECT_SETUP', refId: field, blocking: false });
    }
  }
  for (const q of input.questions) {
    if (q.answerValue?.trim()) continue;
    if (isDeferredToFiling(q)) {
      deferred.push(deferredItem(q.text, q.id));
    } else if (q.required) {
      items.push({ type: 'REQUIRED_QUESTION', label: q.text, stepKey: q.stepKey, refId: q.id, blocking: false });
    }
  }
  for (const f of input.facts) {
    // Recommendations are never confirmed into facts, so they are not "missing" a confirmation.
    if (!f.verified && f.kind !== 'RECOMMENDATION') {
      items.push({ type: 'UNCONFIRMED_INFORMATION', label: f.statement, stepKey: null, refId: f.id, blocking: false });
    }
  }
  for (const q of input.openQuestions) {
    if (q.status !== 'OPEN') continue;
    if (isDeferredToFiling(q)) {
      deferred.push(deferredItem(q.text, q.id));
    } else {
      items.push({ type: 'OPEN_QUESTION', label: q.text, stepKey: q.stepKey, refId: q.id, blocking: q.blocking });
    }
  }
  for (const issue of input.reviewIssues) {
    if (issue.type === 'CONFLICT' && issue.status === 'OPEN') {
      items.push({ type: 'CONFLICT', label: issue.title, stepKey: issue.stepKey, refId: issue.id, blocking: true });
    }
  }
  for (const file of input.files) {
    if (file.extractionStatus === 'FAILED' || file.extractionStatus === 'NOT_SUPPORTED') {
      items.push({
        type: 'DOCUMENT_NEEDS_MANUAL_REVIEW',
        label: file.originalName,
        stepKey: 'DOCUMENT_UPLOAD',
        refId: file.id,
        blocking: false,
      });
    }
  }

  return [...items.filter((i) => i.blocking), ...items.filter((i) => !i.blocking), ...deferred];
}
