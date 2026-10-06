import type {
  ExtractionStatus,
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
  BLOCKER: 'BLOKIRAJUĆE',
  HIGH: 'VISOK',
  MEDIUM: 'SREDNJI',
  LOW: 'NIZAK',
};

export const FUNCTIONALITY_RISK_LABEL: Record<FunctionalityRisk, string> = {
  LOW_RISK: 'NIZAK RIZIK',
  NEEDS_FURTHER_REVIEW: 'POTREBNA DODATNA PROVERA',
  HIGH_FUNCTIONAL_DEPENDENCE: 'VISOKA FUNKCIONALNA ZAVISNOST',
};

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
