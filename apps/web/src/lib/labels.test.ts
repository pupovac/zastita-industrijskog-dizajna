import { describe, expect, it } from 'vitest';
import type { StepStatus } from '@/api/types';
import { STEP_ACTIONS, STEP_STATUS_LABEL } from './labels';

const ALL: StepStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'BLOCKED', 'READY_FOR_REVIEW', 'APPROVED'];

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
});

describe('review severity labels', () => {
  it('shows BLOCKER as "BLOCKER"', async () => {
    const { SEVERITY_LABEL } = await import('./labels');
    expect(SEVERITY_LABEL).toEqual({ BLOCKER: 'BLOCKER', HIGH: 'VISOK', MEDIUM: 'SREDNJI', LOW: 'NIZAK' });
  });
});
