import { ActorType, InformationKind } from '@prisma/client';
import { DomainError } from './domain-error';
import { planConfirmation } from './fact-rules';

/**
 * Provenance rules shared by every agent-writable record that carries `verified`
 * (design features, prior designs, representations, strategy items, D-1 values...).
 * They extend the fact invariant to the whole project memory: `verified` means
 * "confirmed by the user" and is never part of an input DTO.
 */

export interface ProvenancedState {
  verified: boolean;
  /** Absent for records that have no information kind (e.g. a representation). */
  kind?: InformationKind | null;
}

export interface RecordEditResult {
  verified: boolean;
  /** Present only when the record has a kind that changes with the edit. */
  kind?: InformationKind;
  sourceType?: 'USER';
}

/**
 * Editing a record. A confirmed record is locked against agents; any content change
 * by the user drops the confirmation, so the changed content must be confirmed again.
 */
export function planRecordEdit(record: ProvenancedState, actor: ActorType, contentChanged: boolean): RecordEditResult {
  if (!contentChanged) return { verified: record.verified };
  if (record.verified && actor !== 'USER') {
    throw new DomainError(
      'CONFIRMED_VALUE_LOCKED',
      'Potvrđena vrednost se ne može menjati bez korisnika. Predložite izmenu kao otvoreno pitanje.',
      'FORBIDDEN',
    );
  }
  if (record.verified && record.kind === 'FACT') {
    // A user-edited confirmed fact is now the user's own statement until confirmed again.
    return { verified: false, kind: 'USER_STATEMENT', sourceType: 'USER' };
  }
  return { verified: false };
}

export interface RecordConfirmationResult {
  verified: true;
  kind?: InformationKind;
  /** A confirmed recommendation is adopted as a user decision, never turned into a fact. */
  recordAsDecision: boolean;
}

/** Confirms a record. Only the user can do it, explicitly ("POTVRDI"). */
export function planRecordConfirmation(
  record: ProvenancedState,
  input: { actor: ActorType; explicitUserConfirmation: boolean },
): RecordConfirmationResult {
  if (input.actor !== 'USER') {
    throw new DomainError('CONFIRMATION_REQUIRES_USER', 'Samo korisnik može da potvrdi podatak.', 'FORBIDDEN');
  }
  if (input.explicitUserConfirmation !== true) {
    throw new DomainError('CONFIRMATION_NOT_EXPLICIT', 'Potvrda mora biti eksplicitna.');
  }
  if (record.verified) {
    throw new DomainError('ALREADY_CONFIRMED', 'Podatak je već potvrđen.', 'CONFLICT');
  }
  if (!record.kind) return { verified: true, recordAsDecision: false };
  if (record.kind === 'RECOMMENDATION') {
    return { verified: true, kind: 'RECOMMENDATION', recordAsDecision: true };
  }
  const next = planConfirmation(
    { kind: record.kind, originKind: record.kind, sourceType: 'USER', verified: false, confirmedBy: null },
    { actor: input.actor, explicitUserConfirmation: input.explicitUserConfirmation, now: new Date() },
  );
  return { verified: true, kind: next.kind, recordAsDecision: false };
}

/** True when any of the given fields differs between the stored record and the patch. */
export function contentChanged<T extends object>(stored: T, patch: Partial<T>, fields: readonly (keyof T)[]): boolean {
  return fields.some((field) => patch[field] !== undefined && patch[field] !== stored[field]);
}
