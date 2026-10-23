import { describe, expect, it } from 'vitest';
import type { StepStatus } from '@/api/types';
import {
  STEP_ACTIONS,
  STEP_APPROVAL_RULE,
  STEP_STATUS_HELP,
  STEP_STATUS_HINT,
  STEP_STATUS_LABEL,
  stepActionsFor,
} from './labels';

const ALL: StepStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'BLOCKED', 'READY_FOR_REVIEW', 'APPROVED'];

/** Copy of the backend graph (apps/api/src/domain/step-status.ts); the UI must never offer more. */
const BACKEND_TRANSITIONS: Record<StepStatus, StepStatus[]> = {
  NOT_STARTED: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['WAITING_FOR_USER', 'BLOCKED', 'READY_FOR_REVIEW'],
  WAITING_FOR_USER: ['IN_PROGRESS', 'BLOCKED'],
  BLOCKED: ['IN_PROGRESS'],
  READY_FOR_REVIEW: ['APPROVED', 'IN_PROGRESS'],
  APPROVED: ['IN_PROGRESS'],
};

describe('step status labels', () => {
  it('uses the six Serbian status names', () => {
    expect(ALL.map((s) => STEP_STATUS_LABEL[s])).toEqual([
      'NIJE ZAPOČETO',
      'U TOKU',
      'ČEKA KORISNIKA',
      'BLOKIRANO',
      'SPREMNO ZA PREGLED',
      'ODOBRENO',
    ]);
  });

  it('explains every status and who approves', () => {
    for (const s of ALL) {
      expect(STEP_STATUS_HELP[s].length).toBeGreaterThan(20);
      expect(STEP_STATUS_HINT[s].length).toBeGreaterThan(10);
    }
    expect(STEP_APPROVAL_RULE).toContain('isključivo podnosilac');
    expect(STEP_APPROVAL_RULE).toContain('N+1');
  });
});

describe('STEP_ACTIONS', () => {
  it('offers exactly the backend transition graph', () => {
    for (const s of ALL) {
      expect(STEP_ACTIONS[s].map((a) => a.to).sort()).toEqual([...BACKEND_TRANSITIONS[s]].sort());
    }
  });

  it('only offers approval from review', () => {
    const offeringApproval = ALL.filter((s) => STEP_ACTIONS[s].some((a) => a.to === 'APPROVED'));
    expect(offeringApproval).toEqual(['READY_FOR_REVIEW']);
  });

  it('always asks for a reason when blocking', () => {
    for (const s of ALL) {
      for (const action of STEP_ACTIONS[s].filter((a) => a.to === 'BLOCKED')) {
        expect(action.needsReason).toBe(true);
      }
    }
  });

  it('highlights the forward move as the single primary action', () => {
    const primary = (s: StepStatus) => STEP_ACTIONS[s].filter((a) => a.primary).map((a) => a.to);
    expect(primary('IN_PROGRESS')).toEqual(['READY_FOR_REVIEW']);
    expect(primary('READY_FOR_REVIEW')).toEqual(['APPROVED']);
    expect(primary('NOT_STARTED')).toEqual(['IN_PROGRESS']);
    // Reopening an approved step is never the suggested move.
    expect(primary('APPROVED')).toEqual([]);
    for (const s of ALL) expect(primary(s).length).toBeLessThanOrEqual(1);
  });

  it('hides "Čeka korisnika" from the user but keeps it for agents', () => {
    expect(stepActionsFor('IN_PROGRESS', 'USER').map((a) => a.to)).toEqual(['READY_FOR_REVIEW', 'BLOCKED']);
    expect(stepActionsFor('IN_PROGRESS', 'AGENT').map((a) => a.to)).toEqual([
      'READY_FOR_REVIEW',
      'WAITING_FOR_USER',
      'BLOCKED',
    ]);
    const agentOnly = ALL.flatMap((s) => STEP_ACTIONS[s].filter((a) => a.agentOnly).map((a) => a.to));
    expect(agentOnly).toEqual(['WAITING_FOR_USER']);
  });

  it('still lets the user resume a step an agent parked', () => {
    expect(stepActionsFor('WAITING_FOR_USER', 'USER').map((a) => a.label)).toEqual(['Nastavi rad', 'Blokiraj']);
  });

  it('shows the user everything else unchanged', () => {
    for (const s of ALL.filter((s) => s !== 'IN_PROGRESS')) {
      expect(stepActionsFor(s, 'USER')).toEqual(STEP_ACTIONS[s]);
    }
  });
});

describe('review severity labels', () => {
  it('shows BLOCKER as "BLOCKER"', async () => {
    const { SEVERITY_LABEL } = await import('./labels');
    expect(SEVERITY_LABEL).toEqual({ BLOCKER: 'BLOCKER', HIGH: 'VISOK', MEDIUM: 'SREDNJI', LOW: 'NIZAK' });
  });
});
