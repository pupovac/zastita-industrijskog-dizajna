import { describe, expect, it } from 'vitest';
import type { StepStatus } from '@/api/types';
import {
  lockedBy,
  lockedTooltip,
  nextStep,
  previousStep,
  stepTransitionFeedback,
  transitionErrorHint,
  type StepRef,
} from './step-feedback';

const make = (position: number, status: StepStatus, title = `Korak ${position}`): StepRef => ({
  stepKey: `S${position}`,
  position,
  title,
  status,
});

const steps = [make(1, 'APPROVED', 'Podešavanje projekta'), make(2, 'IN_PROGRESS', 'Istraživanje ZIS-a'), make(3, 'NOT_STARTED', 'Sažetak zahteva'), make(4, 'NOT_STARTED')];

describe('stepTransitionFeedback', () => {
  it('tells the user who reviews after sending to review', () => {
    const fb = stepTransitionFeedback('IN_PROGRESS', 'READY_FOR_REVIEW', steps[2]);
    expect(fb.tone).toBe('success');
    expect(fb.message).toContain('Pregledajte podatke');
    expect(fb.message).toContain('„Odobri“');
    expect(fb.unlockedStep).toBeNull();
  });

  it('names the unlocked step after approval', () => {
    const fb = stepTransitionFeedback('READY_FOR_REVIEW', 'APPROVED', steps[2]);
    expect(fb.message).toBe('Korak odobren. Korak 3 „Sažetak zahteva“ je otključan.');
    expect(fb.unlockedStep).toEqual(steps[2]);
  });

  it('handles approval of the last step', () => {
    const fb = stepTransitionFeedback('READY_FOR_REVIEW', 'APPROVED', null);
    expect(fb.message).toContain('poslednji korak');
    expect(fb.unlockedStep).toBeNull();
  });

  it('warns when reopening an approved step', () => {
    const fb = stepTransitionFeedback('APPROVED', 'IN_PROGRESS', steps[2]);
    expect(fb.tone).toBe('warning');
    expect(fb.message).toContain('blokirani');
  });

  it('distinguishes starting, returning for rework and unblocking', () => {
    expect(stepTransitionFeedback('NOT_STARTED', 'IN_PROGRESS', null).message).toContain('započet');
    expect(stepTransitionFeedback('READY_FOR_REVIEW', 'IN_PROGRESS', null).message).toContain('doradu');
    expect(stepTransitionFeedback('BLOCKED', 'IN_PROGRESS', null).message).toContain('Blokada uklonjena');
  });
});

describe('step neighbours', () => {
  it('finds previous and next regardless of input order', () => {
    const shuffled = [steps[3], steps[1], steps[0], steps[2]];
    expect(previousStep(shuffled, steps[0])).toBeNull();
    expect(previousStep(shuffled, steps[2])).toEqual(steps[1]);
    expect(nextStep(shuffled, steps[2])).toEqual(steps[3]);
    expect(nextStep(shuffled, steps[3])).toBeNull();
  });
});

describe('lockedBy', () => {
  it('locks a not-started step behind an unapproved predecessor', () => {
    expect(lockedBy(steps, steps[2])).toEqual(steps[1]);
    expect(lockedTooltip(steps[1])).toBe('Otključava se kada korak 2 bude odobren.');
  });

  it('does not lock when the predecessor is approved, the step is first, or it already started', () => {
    expect(lockedBy(steps, steps[1])).toBeNull(); // IN_PROGRESS
    expect(lockedBy(steps, steps[0])).toBeNull(); // first step
    const open = [make(1, 'APPROVED'), make(2, 'NOT_STARTED')];
    expect(lockedBy(open, open[1])).toBeNull();
  });

  it('locks only against the direct predecessor', () => {
    // Step 4 is locked by step 3 (not yet approved), not by step 2.
    expect(lockedBy(steps, steps[3])).toEqual(steps[2]);
  });
});

describe('transitionErrorHint', () => {
  it('points at the step to approve first', () => {
    expect(transitionErrorHint('PREVIOUS_STEP_NOT_APPROVED', steps[1])).toBe('Prvo odobrite korak 2 „Istraživanje ZIS-a“.');
    expect(transitionErrorHint('PREVIOUS_STEP_NOT_APPROVED', null)).toBeNull();
  });

  it('explains blocking items and stays silent for unknown codes', () => {
    expect(transitionErrorHint('STEP_HAS_OPEN_BLOCKING_ITEMS', null)).toContain('Nedostajuće informacije');
    expect(transitionErrorHint('SOMETHING_ELSE', null)).toBeNull();
    expect(transitionErrorHint(undefined, null)).toBeNull();
  });
});
