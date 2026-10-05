import { ActorType, StepStatus } from '@prisma/client';
import { DomainError } from './domain-error';
import { StepKey } from './steps';

export interface StepSnapshot {
  stepKey: StepKey;
  position: number;
  status: StepStatus;
}

export interface StepTransitionRequest {
  /** All steps of the project (any order). */
  steps: StepSnapshot[];
  stepKey: StepKey;
  to: StepStatus;
  actor: ActorType;
  reason?: string | null;
  /** Open blocking questions + open conflicts attached to the step being moved. */
  openBlockingItems: number;
}

export interface StepStatusChange {
  stepKey: StepKey;
  from: StepStatus;
  to: StepStatus;
  reason: string | null;
}

/** Allowed direct transitions. Anything not listed is rejected. */
export const ALLOWED_TRANSITIONS: Record<StepStatus, readonly StepStatus[]> = {
  NOT_STARTED: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['WAITING_FOR_USER', 'BLOCKED', 'READY_FOR_REVIEW'],
  WAITING_FOR_USER: ['IN_PROGRESS', 'BLOCKED'],
  BLOCKED: ['IN_PROGRESS'],
  READY_FOR_REVIEW: ['APPROVED', 'IN_PROGRESS'],
  APPROVED: ['IN_PROGRESS'],
};

export const REOPENED_UPSTREAM_REASON = 'Prethodni korak je ponovo otvoren.';

/**
 * Decides whether a step may change status and which other steps change with it.
 *
 * Invariants:
 * - Phases cannot be skipped: a step can only start (enter IN_PROGRESS from
 *   NOT_STARTED or BLOCKED) when the previous step is APPROVED.
 * - Only the user can approve a step.
 * - A step cannot go to review while it has open blocking questions or conflicts.
 * - BLOCKED always carries a reason.
 * - Reopening an approved step invalidates every later step that had started:
 *   they become BLOCKED until the reopened step is approved again.
 */
export function planStepTransition(req: StepTransitionRequest): StepStatusChange[] {
  const ordered = [...req.steps].sort((a, b) => a.position - b.position);
  const index = ordered.findIndex((s) => s.stepKey === req.stepKey);
  if (index === -1) {
    throw new DomainError('STEP_NOT_FOUND', 'Korak ne postoji u ovom projektu.', 'NOT_FOUND');
  }
  const current = ordered[index];
  const from = current.status;
  const to = req.to;
  const reason = req.reason?.trim() || null;

  if (from === to) {
    throw new DomainError('STEP_STATUS_UNCHANGED', 'Korak je već u tom statusu.', 'CONFLICT');
  }
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new DomainError(
      'STEP_TRANSITION_NOT_ALLOWED',
      `Prelaz iz statusa ${from} u ${to} nije dozvoljen.`,
      'CONFLICT',
    );
  }

  if (to === 'IN_PROGRESS' && (from === 'NOT_STARTED' || from === 'BLOCKED') && index > 0) {
    const previous = ordered[index - 1];
    if (previous.status !== 'APPROVED') {
      throw new DomainError(
        'PREVIOUS_STEP_NOT_APPROVED',
        'Korak ne može da započne dok prethodni korak nije odobren.',
        'CONFLICT',
      );
    }
  }

  if (to === 'BLOCKED' && !reason) {
    throw new DomainError('BLOCK_REASON_REQUIRED', 'Za blokiranje koraka potrebno je navesti razlog.');
  }

  if (to === 'READY_FOR_REVIEW' && req.openBlockingItems > 0) {
    throw new DomainError(
      'STEP_HAS_OPEN_BLOCKING_ITEMS',
      'Korak ima otvorena blokirajuća pitanja ili nerešene konflikte.',
      'CONFLICT',
    );
  }

  if (to === 'APPROVED' && req.actor !== 'USER') {
    throw new DomainError('APPROVAL_REQUIRES_USER', 'Samo korisnik može da odobri korak.', 'FORBIDDEN');
  }

  const changes: StepStatusChange[] = [{ stepKey: current.stepKey, from, to, reason }];

  if (from === 'APPROVED' && to === 'IN_PROGRESS') {
    for (const later of ordered.slice(index + 1)) {
      if (later.status !== 'NOT_STARTED' && later.status !== 'BLOCKED') {
        changes.push({
          stepKey: later.stepKey,
          from: later.status,
          to: 'BLOCKED',
          reason: REOPENED_UPSTREAM_REASON,
        });
      }
    }
  }

  return changes;
}

/** Overall progress: share of approved steps, 0..100. */
export function progressPercent(steps: Pick<StepSnapshot, 'status'>[]): number {
  if (steps.length === 0) return 0;
  const approved = steps.filter((s) => s.status === 'APPROVED').length;
  return Math.round((approved / steps.length) * 100);
}
