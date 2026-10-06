import { ActorType, ReviewIssueStatus, ReviewIssueType, Severity } from '@prisma/client';
import { DomainError } from './domain-error';

/**
 * The 17 checks of the independent review (§3, Agent 7). A finding may reference
 * the check that produced it, so the checklist can tell which findings matter where.
 */
export const REVIEW_CHECKS = [
  { key: 'DESCRIPTION_MATCHES_REPRESENTATIONS', label: 'Da li se opis i prikazi slažu' },
  { key: 'FEATURES_VISIBLE', label: 'Da li su opisane karakteristike stvarno vidljive' },
  { key: 'UNDESCRIBED_FEATURES', label: 'Vidljive karakteristike koje nisu opisane' },
  { key: 'TOO_FUNCTIONAL', label: 'Previše funkcionalan opis' },
  { key: 'PATENT_STYLE', label: 'Patentni stil pisanja' },
  { key: 'UNSUPPORTED_CLAIMS', label: 'Nepotkrepljene tvrdnje' },
  { key: 'WRONG_TERMINOLOGY', label: 'Pogrešna terminologija' },
  { key: 'INSUFFICIENT_VIEWS', label: 'Nedovoljan broj prikaza' },
  { key: 'DIFFERENT_GEOMETRY', label: 'Različita geometrija proizvoda na različitim prikazima' },
  { key: 'DIFFERENT_TEXTURE_OR_MATERIAL', label: 'Različita tekstura ili materijal na različitim prikazima' },
  { key: 'WRONG_APPLICANT', label: 'Pogrešni podaci o podnosiocu' },
  { key: 'WRONG_AUTHOR', label: 'Pogrešni podaci o autoru' },
  { key: 'NOVELTY', label: 'Potencijalni problem novosti' },
  { key: 'FUNCTION_DICTATED', label: 'Karakteristike određene isključivo funkcijom' },
  { key: 'MISSING_ATTACHMENTS', label: 'Nedostajući prilozi' },
  { key: 'D1_MISMATCH', label: 'Neslaganje sa D-1' },
  { key: 'OUTDATED_RULES', label: 'Korišćenje zastarelih pravila' },
] as const;

export const REVIEW_CHECK_KEYS = REVIEW_CHECKS.map((c) => c.key) as [string, ...string[]];

export interface FindingState {
  type: ReviewIssueType;
  status: ReviewIssueStatus;
  severity: Severity;
}

export interface FindingStatusChange {
  actor: ActorType;
  to: ReviewIssueStatus;
  note?: string | null;
  now: Date;
}

export interface FindingStatusResult {
  status: ReviewIssueStatus;
  resolutionNote: string | null;
  resolvedBy: ActorType | null;
  resolvedAt: Date | null;
}

/**
 * Changing the resolution status of a review finding.
 * - Conflicts between documents are resolved only by choosing the correct file.
 * - Resolving (the problem was fixed) can be recorded by the reviewer or the user.
 * - Dismissing (the finding is accepted as is) is a user decision and needs a reason.
 */
export function planFindingStatusChange(finding: FindingState, change: FindingStatusChange): FindingStatusResult {
  if (finding.type === 'CONFLICT') {
    throw new DomainError(
      'CONFLICT_NEEDS_FILE_CHOICE',
      'Neslaganje između dokumenata rešava se izborom tačne verzije.',
      'CONFLICT',
    );
  }
  if (finding.status === change.to) {
    throw new DomainError('FINDING_STATUS_UNCHANGED', 'Nalaz je već u tom statusu.', 'CONFLICT');
  }
  const note = change.note?.trim() || null;
  if (change.to === 'OPEN') {
    return { status: 'OPEN', resolutionNote: null, resolvedBy: null, resolvedAt: null };
  }
  if (change.to === 'DISMISSED') {
    if (change.actor !== 'USER') {
      throw new DomainError('DISMISS_REQUIRES_USER', 'Samo korisnik može da prihvati nalaz bez ispravke.', 'FORBIDDEN');
    }
    if (!note) {
      throw new DomainError('DISMISS_REASON_REQUIRED', 'Za odbacivanje nalaza potrebno je obrazloženje.');
    }
  }
  return { status: change.to, resolutionNote: note, resolvedBy: change.actor, resolvedAt: change.now };
}
