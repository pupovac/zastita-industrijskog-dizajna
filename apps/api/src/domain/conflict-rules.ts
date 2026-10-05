import { ActorType, ReviewIssueStatus, ReviewIssueType } from '@prisma/client';
import { DomainError } from './domain-error';

/**
 * Conflicts between uploaded materials (e.g. a photo and a technical drawing that
 * show a different edge profile) are flagged and handed back to the user.
 * The system never picks the correct version on its own.
 */

export interface ConflictFile {
  id: string;
  projectId: string;
}

export function assertValidConflict(projectId: string, a: ConflictFile, b: ConflictFile, attribute: string): void {
  if (a.id === b.id) {
    throw new DomainError('CONFLICT_SAME_FILE', 'Konflikt mora povezati dva različita dokumenta.');
  }
  if (a.projectId !== projectId || b.projectId !== projectId) {
    throw new DomainError('CONFLICT_FOREIGN_FILE', 'Oba dokumenta moraju pripadati ovom projektu.');
  }
  if (!attribute.trim()) {
    throw new DomainError('CONFLICT_ATTRIBUTE_REQUIRED', 'Navedite karakteristiku koja se razlikuje.');
  }
}

export interface ConflictIssueState {
  type: ReviewIssueType;
  status: ReviewIssueStatus;
  fileAId: string | null;
  fileBId: string | null;
}

export interface ConflictResolutionInput {
  actor: ActorType;
  chosenFileId: string;
  note?: string | null;
  now: Date;
}

export interface ConflictResolutionResult {
  status: 'RESOLVED';
  chosenFileId: string;
  resolutionNote: string | null;
  resolvedBy: 'USER';
  resolvedAt: Date;
}

export function planConflictResolution(
  issue: ConflictIssueState,
  input: ConflictResolutionInput,
): ConflictResolutionResult {
  if (issue.type !== 'CONFLICT') {
    throw new DomainError('NOT_A_CONFLICT', 'Stavka nije konflikt.');
  }
  if (issue.status !== 'OPEN') {
    throw new DomainError('CONFLICT_NOT_OPEN', 'Konflikt je već zatvoren.', 'CONFLICT');
  }
  if (input.actor !== 'USER') {
    throw new DomainError(
      'CONFLICT_RESOLUTION_REQUIRES_USER',
      'Konflikt rešava isključivo korisnik — sistem ne bira tačnu verziju automatski.',
      'FORBIDDEN',
    );
  }
  if (input.chosenFileId !== issue.fileAId && input.chosenFileId !== issue.fileBId) {
    throw new DomainError('CONFLICT_INVALID_CHOICE', 'Izabrani dokument nije deo ovog konflikta.');
  }
  return {
    status: 'RESOLVED',
    chosenFileId: input.chosenFileId,
    resolutionNote: input.note?.trim() || null,
    resolvedBy: 'USER',
    resolvedAt: input.now,
  };
}
