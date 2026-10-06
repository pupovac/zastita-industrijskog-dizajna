import type {
  ActorType,
  ExtractionStatus,
  FeatureCategory,
  GeneratedDocumentType,
  RepresentationAssessment,
  RepresentationMedium,
  RepresentationRequirement,
  ReviewIssueStatus,
  SearchCoverageStatus,
  SignoffRole,
  SimilarityLevel,
  FileRole,
  FunctionalityRisk,
  InformationKind,
  Severity,
  SourceType,
  StepPhase,
  StepStatus,
} from '@/api/types';

type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'outline' | 'secondary';

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  NOT_STARTED: 'NIJE ZAPOČETO',
  IN_PROGRESS: 'U TOKU',
  WAITING_FOR_USER: 'ČEKA KORISNIKA',
  BLOCKED: 'BLOKIRANO',
  READY_FOR_REVIEW: 'SPREMNO ZA PREGLED',
  APPROVED: 'ODOBRENO',
};

export const STEP_STATUS_TONE: Record<StepStatus, BadgeTone> = {
  NOT_STARTED: 'muted',
  IN_PROGRESS: 'info',
  WAITING_FOR_USER: 'warning',
  BLOCKED: 'danger',
  READY_FOR_REVIEW: 'secondary',
  APPROVED: 'success',
};

export const STEP_PHASE_LABEL: Record<StepPhase, string> = {
  DRAFTING: 'Izrada dokumenta',
  FILING: 'Podnošenje prijave',
};

/** Marks questions and steps needed only for filing; they never hold up drafting. */
export const DEFERRED_TO_FILING_LABEL = 'ODLOŽENO ZA PODNOŠENJE';

export const FILING_PHASE_NOTE =
  'Takse, podaci za D-1, e-Prijava, zastupnik i pravo prvenstva rešavaju se posle nezavisne provere opisa i prikaza.';

export const KIND_LABEL: Record<InformationKind, string> = {
  FACT: 'ČINJENICA',
  USER_STATEMENT: 'IZJAVA KORISNIKA',
  LEGAL_REQUIREMENT: 'PRAVNI ZAHTEV',
  AI_INFERENCE: 'AI ZAKLJUČAK',
  RECOMMENDATION: 'PREPORUKA',
};

export const KIND_TONE: Record<InformationKind, BadgeTone> = {
  FACT: 'success',
  USER_STATEMENT: 'info',
  LEGAL_REQUIREMENT: 'secondary',
  AI_INFERENCE: 'warning',
  RECOMMENDATION: 'outline',
};

export const CONFIRMED_USER_FACT_LABEL = 'POTVRĐENA ČINJENICA KORISNIKA';

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  USER: 'Korisnik',
  DOCUMENT: 'Dokument',
  ZIS: 'ZIS',
  WIPO: 'WIPO',
  EUIPO: 'EUIPO',
  AGENT_INFERENCE: 'Zaključak agenta',
};

export const FILE_ROLE_LABEL: Record<FileRole, string> = {
  PHOTO: 'Fotografija',
  TECHNICAL_DRAWING: 'Tehnički crtež',
  RENDER: 'Render',
  CAD_EXPORT: 'CAD prikaz',
  DOCUMENT: 'Dokument',
  OTHER: 'Ostalo',
};

export const EXTRACTION_STATUS_LABEL: Record<ExtractionStatus, string> = {
  PENDING: 'Obrada u toku',
  EXTRACTED: 'Obrađeno',
  NOT_SUPPORTED: 'Obrada nije podržana',
  FAILED: 'Potrebna ručna provera',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  BLOCKER: 'BLOCKER',
  HIGH: 'VISOK',
  MEDIUM: 'SREDNJI',
  LOW: 'NIZAK',
};

export const FUNCTIONALITY_RISK_LABEL: Record<FunctionalityRisk, string> = {
  LOW_RISK: 'NIZAK RIZIK',
  NEEDS_FURTHER_REVIEW: 'POTREBNA DODATNA PROVERA',
  HIGH_FUNCTIONAL_DEPENDENCE: 'VISOKA FUNKCIONALNA ZAVISNOST',
};

export const SEVERITY_TONE: Record<Severity, BadgeTone> = {
  BLOCKER: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'muted',
};

export const ISSUE_STATUS_LABEL: Record<ReviewIssueStatus, string> = {
  OPEN: 'OTVORENO',
  RESOLVED: 'REŠENO',
  DISMISSED: 'PRIHVAĆENO BEZ ISPRAVKE',
};

export const FEATURE_CATEGORY_LABEL: Record<FeatureCategory, string> = {
  A_VISUAL: 'A — pre svega vizuelna / estetska',
  B_MIXED: 'B — mešovita vizuelna i funkcionalna',
  C_TECHNICAL: 'C — pretežno tehnička / funkcionalna',
  D_UNCLEAR: 'D — nejasno, potrebna dodatna analiza',
};

export const SIMILARITY_LABEL: Record<SimilarityLevel, string> = { LOW: 'NISKA', MEDIUM: 'SREDNJA', HIGH: 'VISOKA' };

export const COVERAGE_STATUS_LABEL: Record<SearchCoverageStatus, string> = {
  COMPLETED: 'Završeno',
  PARTIAL: 'Delimično',
  BLOCKED: 'Pristup blokiran',
  SKIPPED: 'Preskočeno',
};

export const REPRESENTATION_REQUIREMENT_LABEL: Record<RepresentationRequirement, string> = {
  MANDATORY: 'Obavezan',
  RECOMMENDED: 'Preporučen',
};

export const REPRESENTATION_MEDIUM_LABEL: Record<RepresentationMedium, string> = {
  RENDER: 'Realistični 3D render',
  CAD: 'CAD prikaz',
  PHOTO: 'Fotografija',
  LINE_DRAWING: 'Linijski crtež',
};

export const ASSESSMENT_LABEL: Record<RepresentationAssessment, string> = {
  ACCEPTABLE: 'PRIHVATLJIVO',
  NEEDS_REWORK: 'POTREBNA DORADA',
  UNSUITABLE: 'NEODGOVARAJUĆE',
};

export const ASSESSMENT_TONE: Record<RepresentationAssessment, BadgeTone> = {
  ACCEPTABLE: 'success',
  NEEDS_REWORK: 'warning',
  UNSUITABLE: 'danger',
};

export const STRATEGY_VALUE_LABEL: Record<string, string> = {
  SINGLE: 'Jedna prijava (jedan predmet zaštite)',
  SEPARATE: 'Više zasebnih prijava',
  MULTIPLE: 'Višestruka prijava',
  YES: 'Da',
  NO: 'Ne',
};

export const SIGNOFF_ROLE_LABEL: Record<SignoffRole, string> = { APPLICANT: 'Podnosilac', REPRESENTATIVE: 'Zastupnik' };

export const ACTOR_LABEL: Record<ActorType, string> = { USER: 'Korisnik', AGENT: 'Agent', SYSTEM: 'Sistem' };

export const GENERATED_DOCUMENT_LABEL: Record<GeneratedDocumentType, string> = {
  DESCRIPTION: 'Opis industrijskog dizajna',
  PACKAGE_DOCX: 'Paket prijave (DOCX)',
  PACKAGE_PDF: 'Paket prijave — PDF za pregled',
  D1_DATA: 'Podaci za D-1',
  REPRESENTATION_INDEX: 'Indeks prikaza',
  FILING_CHECKLIST: 'Checklista za podnošenje',
  ATTACHMENT_LIST: 'Spisak priloga',
  SOURCES_REPORT: 'Izveštaj o izvorima i proverama',
  OPEN_LEGAL_QUESTIONS: 'Nerešena pravna pitanja za ZIS ili zastupnika',
};

/** Shown on every screen of the demo project. */
export const DEMO_BANNER = 'DEMO – izmišljeni podaci, ne koristiti za prijavu';

export const NO_GUARANTEE_NOTICE =
  'Sistem ne garantuje da će prijava biti prihvaćena i prijavu ne podnosi automatski. Nije zamena za registrovanog zastupnika.';

/** Status buttons offered for each current status (the backend enforces the same graph). */
export const STEP_ACTIONS: Record<StepStatus, { to: StepStatus; label: string; needsReason?: boolean }[]> = {
  NOT_STARTED: [
    { to: 'IN_PROGRESS', label: 'Započni korak' },
    { to: 'BLOCKED', label: 'Blokiraj', needsReason: true },
  ],
  IN_PROGRESS: [
    { to: 'READY_FOR_REVIEW', label: 'Pošalji na pregled' },
    { to: 'WAITING_FOR_USER', label: 'Čeka korisnika' },
    { to: 'BLOCKED', label: 'Blokiraj', needsReason: true },
  ],
  WAITING_FOR_USER: [
    { to: 'IN_PROGRESS', label: 'Nastavi rad' },
    { to: 'BLOCKED', label: 'Blokiraj', needsReason: true },
  ],
  BLOCKED: [{ to: 'IN_PROGRESS', label: 'Ukloni blokadu' }],
  READY_FOR_REVIEW: [
    { to: 'APPROVED', label: 'Odobri' },
    { to: 'IN_PROGRESS', label: 'Vrati na doradu' },
  ],
  APPROVED: [{ to: 'IN_PROGRESS', label: 'Ponovo otvori' }],
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('sr-Latn-RS', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('sr-Latn-RS', { dateStyle: 'medium' }) : '—';
}
