import { FunctionalityRisk, RepresentationAssessment, RepresentationRequirement, SearchCoverageStatus, StepStatus } from '@prisma/client';
import { NOT_APPLICABLE_VALUE } from './d1-fields';

/**
 * The 16 quality checkpoints before finalization (§16). Every item is derived from
 * the state of the project memory — nobody ticks a box by hand.
 */
export interface ChecklistInput {
  steps: { stepKey: string; status: StepStatus }[];
  sourceCodes: string[];
  feeRequirementCount: number;
  project: { applicantName: string; designerName: string };
  d1: { fieldKey: string; value: string }[];
  sections: { key: string; confirmed: boolean }[];
  representations: {
    requirement: RepresentationRequirement;
    hasFile: boolean;
    assessment: RepresentationAssessment | null;
  }[];
  openConflicts: number;
  /** Open reviewer findings about inconsistent geometry/texture between views. */
  openConsistencyFindings: number;
  /** Open reviewer findings about the description not matching the views. */
  openDescriptionFindings: number;
  features: { functionalityRisk: FunctionalityRisk | null }[];
  searchCoverage: { database: string; status: SearchCoverageStatus }[];
  priorDisclosureQuestions: { answered: boolean }[];
  openBlockers: number;
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  /** Why the item is (not) done, in terms of the project state. */
  detail: string;
}

/** Reviewer check keys that count against "svi prikazi prikazuju isti dizajn". */
export const CONSISTENCY_CHECK_KEYS = ['DIFFERENT_GEOMETRY', 'DIFFERENT_TEXTURE_OR_MATERIAL'];
/** Reviewer check keys that count against "opis odgovara prikazima". */
export const DESCRIPTION_CHECK_KEYS = ['DESCRIPTION_MATCHES_REPRESENTATIONS', 'FEATURES_VISIBLE', 'UNDESCRIBED_FEATURES'];

export function evaluateChecklist(input: ChecklistInput): ChecklistItem[] {
  const approved = (stepKey: string) => input.steps.find((s) => s.stepKey === stepKey)?.status === 'APPROVED';
  const d1 = (key: string) => input.d1.find((f) => f.fieldKey === key)?.value.trim() ?? '';
  const sectionConfirmed = (key: string) => input.sections.find((s) => s.key === key)?.confirmed === true;
  const hasSource = (code: string) => input.sourceCodes.includes(code);
  const item = (key: string, label: string, done: boolean, ok: string, missing: string): ChecklistItem => ({
    key,
    label,
    done,
    detail: done ? ok : missing,
  });

  const authorIsApplicant =
    Boolean(input.project.designerName.trim()) &&
    input.project.designerName.trim().toLowerCase() === input.project.applicantName.trim().toLowerCase();
  const legalBasis = d1('LEGAL_BASIS');
  const mandatoryViews = input.representations.filter((r) => r.requirement === 'MANDATORY');
  const viewsWithFiles = input.representations.filter((r) => r.hasFile);
  const zisSearch = input.searchCoverage.find((c) => /zis/i.test(c.database) && c.status !== 'SKIPPED');

  return [
    item(
      'ZIS_INSTRUCTIONS',
      'Pregledana su aktuelna zvanična ZIS uputstva',
      hasSource('Z-05') && approved('ZIS_RESEARCH'),
      'Uputstvo (Z-05) je evidentirano, korak „Istraživanje ZIS-a" je odobren.',
      'Potrebno: evidentirano Uputstvo (Z-05) i odobren korak „Istraživanje ZIS-a".',
    ),
    item(
      'D1_REVIEWED',
      'Pregledan je aktuelni D-1',
      hasSource('Z-04') && approved('REQUIREMENTS_SUMMARY'),
      'Obrazac D-1 (Z-04) je evidentiran, „Sažetak zahteva" je odobren.',
      'Potrebno: evidentiran obrazac D-1 (Z-04) i odobren korak „Sažetak zahteva".',
    ),
    item(
      'APPLICANT',
      'Podnosilac je utvrđen',
      Boolean(input.project.applicantName.trim() && d1('APPLICANT')),
      'Podnosilac je unet u projekat i u polje 1 obrasca D-1.',
      'Potrebno: podnosilac u podešavanju projekta i polje 1 obrasca D-1.',
    ),
    item(
      'AUTHOR',
      'Autor je utvrđen',
      Boolean(input.project.designerName.trim()),
      'Autor je unet u projekat.',
      'Potrebno: autor / dizajner u podešavanju projekta.',
    ),
    item(
      'LEGAL_BASIS',
      'Razjašnjen je pravni osnov ako autor nije podnosilac',
      authorIsApplicant || Boolean(legalBasis && legalBasis !== NOT_APPLICABLE_VALUE),
      authorIsApplicant ? 'Autor je ujedno i podnosilac.' : 'Pravni osnov je upisan u polje 6 obrasca D-1.',
      'Potrebno: pravni osnov u polju 6 obrasca D-1 (autor nije podnosilac ili podaci nisu uneti).',
    ),
    item(
      'TITLE',
      'Naziv proizvoda je finalizovan',
      sectionConfirmed('TITLE') && Boolean(d1('PRODUCT_TITLE')),
      'Naziv je potvrđen u opisu i upisan u polje 3 obrasca D-1.',
      'Potrebno: potvrđena sekcija „Naziv proizvoda" i polje 3 obrasca D-1.',
    ),
    item(
      'REPRESENTATIONS_FINAL',
      'Prikazi su finalizovani',
      approved('REPRESENTATION_PLAN') &&
        mandatoryViews.length > 0 &&
        mandatoryViews.every((r) => r.hasFile && r.assessment === 'ACCEPTABLE'),
      'Plan prikaza je odobren, svi obavezni prikazi su dostavljeni i ocenjeni kao PRIHVATLJIVO.',
      'Potrebno: odobren plan prikaza; svaki obavezan prikaz dostavljen i ocenjen kao PRIHVATLJIVO.',
    ),
    item(
      'SAME_DESIGN',
      'Svi prikazi prikazuju isti dizajn',
      viewsWithFiles.length > 0 && input.openConflicts === 0 && input.openConsistencyFindings === 0,
      'Nema otvorenih neslaganja između prikaza.',
      'Potrebno: dostavljeni prikazi, bez otvorenih neslaganja i nalaza o različitoj geometriji ili teksturi.',
    ),
    item(
      'DESCRIPTION_MATCHES',
      'Opis odgovara prikazima',
      sectionConfirmed('DESCRIPTION') && approved('DESCRIPTION_DRAFTING') && input.openDescriptionFindings === 0,
      'Opis je potvrđen, korak „Izrada opisa" je odobren, nema otvorenih nalaza o neslaganju opisa i prikaza.',
      'Potrebno: potvrđen opis, odobren korak „Izrada opisa" i bez otvorenih nalaza o neslaganju opisa i prikaza.',
    ),
    item(
      'TECHNICAL_FUNCTION',
      'Analiziran je problem tehničke funkcije',
      approved('VISUAL_ANALYSIS') && input.features.length > 0 && input.features.every((f) => f.functionalityRisk),
      'Svaka karakteristika ima klasifikaciju rizika, korak je odobren.',
      'Potrebno: klasifikacija rizika za svaku karakteristiku i odobren korak „Analiza vizuelnih karakteristika".',
    ),
    item(
      'PRIOR_SEARCH',
      'Urađena je pretraga postojećih dizajna',
      approved('PRIOR_DESIGN_SEARCH') && Boolean(zisSearch),
      'Pretraga baze ZIS-a je zabeležena u izveštaju o pokrivenosti, korak je odobren.',
      'Potrebno: zabeležena pretraga baze ZIS-a (obavezna) i odobren korak „Pretraga postojećih dizajna".',
    ),
    item(
      'PRIOR_DISCLOSURE',
      'Odgovoreno je na pitanje o prethodnom javnom objavljivanju',
      input.priorDisclosureQuestions.length > 0 && input.priorDisclosureQuestions.every((q) => q.answered),
      'Sva pitanja grupe G su odgovorena.',
      'Potrebno: odgovori na sva pitanja grupe G (prethodno javno objavljivanje).',
    ),
    item(
      'FEES',
      'Proverene su aktuelne takse',
      input.feeRequirementCount > 0 && Boolean(d1('FEES')),
      'Takse iz Matrice zahteva su uvezene i upisane u polje 10 obrasca D-1.',
      'Potrebno: uvezena Matrica zahteva (oblast takse) i polje 10 obrasca D-1.',
    ),
    item(
      'ATTACHMENTS',
      'Identifikovani su svi prilozi',
      Boolean(d1('ATTACHMENTS')) && sectionConfirmed('ATTACHMENT_LIST'),
      'Prilozi su označeni u D-1 i spisak priloga je potvrđen.',
      'Potrebno: prilozi označeni u D-1 i potvrđena sekcija „Spisak priloga".',
    ),
    item(
      'INDEPENDENT_REVIEW',
      'Izvršena je nezavisna provera',
      approved('INDEPENDENT_REVIEW'),
      'Korak „Nezavisna provera" je odobren.',
      'Potrebno: odobren korak „Nezavisna provera".',
    ),
    item(
      'NO_BLOCKERS',
      'Nema BLOCKER problema',
      input.openBlockers === 0,
      'Nema nerešenih nalaza BLOCKER.',
      `Nerešenih nalaza BLOCKER: ${input.openBlockers}.`,
    ),
  ];
}
