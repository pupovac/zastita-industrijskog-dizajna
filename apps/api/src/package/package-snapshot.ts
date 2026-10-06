import { PrismaClient } from '@prisma/client';
import { ChecklistInput, CONSISTENCY_CHECK_KEYS, DESCRIPTION_CHECK_KEYS, evaluateChecklist } from '../domain/filing-checklist';
import { findPatentTerms } from '../domain/patent-terms';
import { INITIAL_RESEARCH_REPORT } from '../research/research-import.service';

type Db = Pick<
  PrismaClient,
  | 'project'
  | 'projectStep'
  | 'source'
  | 'sourceRequirement'
  | 'd1FieldValue'
  | 'applicationSection'
  | 'representation'
  | 'reviewIssue'
  | 'designFeature'
  | 'searchCoverage'
  | 'question'
  | 'priorDesign'
  | 'openQuestion'
  | 'decision'
  | 'protectionStrategyItem'
  | 'researchReportSection'
>;

/** Everything the final package is built from, read once from the project memory. */
export async function loadPackageSnapshot(db: Db, projectId: string) {
  const where = { projectId };
  const [
    project,
    steps,
    sources,
    requirements,
    d1,
    sections,
    representations,
    issues,
    features,
    coverage,
    groupG,
    priorDesigns,
    openQuestions,
    decisions,
    strategy,
    report,
  ] = await Promise.all([
    db.project.findUniqueOrThrow({ where: { id: projectId } }),
    db.projectStep.findMany({ where, orderBy: { position: 'asc' } }),
    db.source.findMany({ where, orderBy: [{ priority: 'asc' }, { code: 'asc' }] }),
    db.sourceRequirement.findMany({ where, orderBy: { createdAt: 'asc' } }),
    db.d1FieldValue.findMany({ where }),
    db.applicationSection.findMany({
      where,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    }),
    db.representation.findMany({ where, orderBy: { position: 'asc' }, include: { uploadedFile: true } }),
    db.reviewIssue.findMany({ where, orderBy: { createdAt: 'asc' } }),
    db.designFeature.findMany({ where, orderBy: { createdAt: 'asc' } }),
    db.searchCoverage.findMany({ where, orderBy: { createdAt: 'asc' } }),
    db.question.findMany({ where: { projectId, interviewGroup: 'G' }, include: { answers: true } }),
    db.priorDesign.findMany({ where, orderBy: { createdAt: 'asc' } }),
    db.openQuestion.findMany({ where: { projectId, status: 'OPEN' }, orderBy: { createdAt: 'asc' } }),
    db.decision.findMany({ where, orderBy: { createdAt: 'asc' } }),
    db.protectionStrategyItem.findMany({ where }),
    db.researchReportSection.findMany({ where: { projectId, reportKey: INITIAL_RESEARCH_REPORT } }),
  ]);
  return {
    project,
    steps,
    sources,
    requirements,
    d1,
    sections: sections.map(({ versions, ...s }) => ({ ...s, latest: versions[0] ?? null })),
    representations,
    issues,
    features,
    coverage,
    groupG,
    priorDesigns,
    openQuestions,
    decisions,
    strategy,
    report,
  };
}

export type PackageSnapshot = Awaited<ReturnType<typeof loadPackageSnapshot>>;

const openFinding = (keys: string[]) => (i: PackageSnapshot['issues'][number]) =>
  i.status === 'OPEN' && i.checkKey !== null && keys.includes(i.checkKey);

export function checklistInput(s: PackageSnapshot): ChecklistInput {
  return {
    steps: s.steps,
    sourceCodes: s.sources.map((src) => src.code).filter((c): c is string => Boolean(c)),
    feeRequirementCount: s.requirements.filter((r) => r.areaCode === 'fees').length,
    project: s.project,
    d1: s.d1,
    sections: s.sections.map((sec) => ({ key: sec.key, confirmed: sec.confirmed })),
    representations: s.representations.map((r) => ({
      requirement: r.requirement,
      hasFile: Boolean(r.uploadedFileId),
      assessment: r.assessment,
    })),
    openConflicts: s.issues.filter((i) => i.type === 'CONFLICT' && i.status === 'OPEN').length,
    openConsistencyFindings: s.issues.filter(openFinding(CONSISTENCY_CHECK_KEYS)).length,
    openDescriptionFindings: s.issues.filter(openFinding(DESCRIPTION_CHECK_KEYS)).length,
    features: s.features,
    searchCoverage: s.coverage,
    priorDisclosureQuestions: s.groupG.map((q) => ({ answered: Boolean(q.answers[0]?.value.trim()) })),
    openBlockers: openBlockers(s),
  };
}

export function openBlockers(s: PackageSnapshot): number {
  return s.issues.filter((i) => i.status === 'OPEN' && i.severity === 'BLOCKER').length;
}

export function checklistOf(s: PackageSnapshot) {
  return evaluateChecklist(checklistInput(s));
}

/** Patent terminology in the latest text of each section. */
export function terminologyOf(s: PackageSnapshot) {
  return s.sections.map((sec) => ({
    sectionTitle: sec.title,
    matches: findPatentTerms(sec.latest?.content ?? ''),
  }));
}
