import { StepStatus } from '@prisma/client';
import { DomainError } from './domain-error';
import { planStepTransition, progressPercent, REOPENED_UPSTREAM_REASON, StepSnapshot } from './step-status';
import { STEP_KEYS, StepKey } from './steps';

function steps(statuses: Partial<Record<StepKey, StepStatus>> = {}): StepSnapshot[] {
  return STEP_KEYS.map((stepKey, i) => ({ stepKey, position: i + 1, status: statuses[stepKey] ?? 'NOT_STARTED' }));
}

function expectError(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    expect((e as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`expected DomainError ${code}`);
}

const base = { actor: 'USER' as const, openBlockingItems: 0 };

describe('planStepTransition', () => {
  it('starts the first step without a predecessor', () => {
    const changes = planStepTransition({ ...base, steps: steps(), stepKey: 'PROJECT_SETUP', to: 'IN_PROGRESS' });
    expect(changes).toEqual([{ stepKey: 'PROJECT_SETUP', from: 'NOT_STARTED', to: 'IN_PROGRESS', reason: null }]);
  });

  it('does not allow skipping a phase', () => {
    expectError(
      () => planStepTransition({ ...base, steps: steps(), stepKey: 'ZIS_RESEARCH', to: 'IN_PROGRESS' }),
      'PREVIOUS_STEP_NOT_APPROVED',
    );
    expectError(
      () =>
        planStepTransition({
          ...base,
          steps: steps({ PROJECT_SETUP: 'READY_FOR_REVIEW' }),
          stepKey: 'ZIS_RESEARCH',
          to: 'IN_PROGRESS',
        }),
      'PREVIOUS_STEP_NOT_APPROVED',
    );
  });

  it('starts the independent review right after the description, without D-1 data', () => {
    const changes = planStepTransition({
      ...base,
      steps: steps({ DESCRIPTION_DRAFTING: 'APPROVED', D1_FORM_DATA: 'NOT_STARTED' }),
      stepKey: 'INDEPENDENT_REVIEW',
      to: 'IN_PROGRESS',
    });
    expect(changes).toEqual([{ stepKey: 'INDEPENDENT_REVIEW', from: 'NOT_STARTED', to: 'IN_PROGRESS', reason: null }]);
  });

  it('opens filing only after the reviewed document is approved', () => {
    expectError(
      () =>
        planStepTransition({
          ...base,
          steps: steps({ DESCRIPTION_DRAFTING: 'APPROVED', INDEPENDENT_REVIEW: 'READY_FOR_REVIEW' }),
          stepKey: 'D1_FORM_DATA',
          to: 'IN_PROGRESS',
        }),
      'PREVIOUS_STEP_NOT_APPROVED',
    );
  });

  it('starts a step once the previous one is approved', () => {
    const changes = planStepTransition({
      ...base,
      steps: steps({ PROJECT_SETUP: 'APPROVED' }),
      stepKey: 'ZIS_RESEARCH',
      to: 'IN_PROGRESS',
    });
    expect(changes).toHaveLength(1);
    expect(changes[0].to).toBe('IN_PROGRESS');
  });

  it('does not unblock a step while its predecessor is not approved', () => {
    expectError(
      () =>
        planStepTransition({
          ...base,
          steps: steps({ PROJECT_SETUP: 'IN_PROGRESS', ZIS_RESEARCH: 'BLOCKED' }),
          stepKey: 'ZIS_RESEARCH',
          to: 'IN_PROGRESS',
        }),
      'PREVIOUS_STEP_NOT_APPROVED',
    );
  });

  it('allows moving between in-progress and waiting for user regardless of predecessor checks', () => {
    const s = steps({ PROJECT_SETUP: 'APPROVED', ZIS_RESEARCH: 'WAITING_FOR_USER' });
    expect(planStepTransition({ ...base, steps: s, stepKey: 'ZIS_RESEARCH', to: 'IN_PROGRESS' })[0].to).toBe(
      'IN_PROGRESS',
    );
  });

  it('rejects transitions outside the allowed graph', () => {
    expectError(
      () => planStepTransition({ ...base, steps: steps(), stepKey: 'PROJECT_SETUP', to: 'APPROVED' }),
      'STEP_TRANSITION_NOT_ALLOWED',
    );
    expectError(
      () =>
        planStepTransition({
          ...base,
          steps: steps({ PROJECT_SETUP: 'IN_PROGRESS' }),
          stepKey: 'PROJECT_SETUP',
          to: 'APPROVED',
        }),
      'STEP_TRANSITION_NOT_ALLOWED',
    );
  });

  it('rejects a no-op transition', () => {
    expectError(
      () =>
        planStepTransition({
          ...base,
          steps: steps({ PROJECT_SETUP: 'IN_PROGRESS' }),
          stepKey: 'PROJECT_SETUP',
          to: 'IN_PROGRESS',
        }),
      'STEP_STATUS_UNCHANGED',
    );
  });

  it('requires a reason to block', () => {
    const s = steps({ PROJECT_SETUP: 'IN_PROGRESS' });
    expectError(
      () => planStepTransition({ ...base, steps: s, stepKey: 'PROJECT_SETUP', to: 'BLOCKED', reason: '   ' }),
      'BLOCK_REASON_REQUIRED',
    );
    const changes = planStepTransition({
      ...base,
      steps: s,
      stepKey: 'PROJECT_SETUP',
      to: 'BLOCKED',
      reason: ' Nedostaje dokument ',
    });
    expect(changes[0].reason).toBe('Nedostaje dokument');
  });

  it('does not allow review while blocking items are open', () => {
    expectError(
      () =>
        planStepTransition({
          ...base,
          openBlockingItems: 2,
          steps: steps({ PROJECT_SETUP: 'IN_PROGRESS' }),
          stepKey: 'PROJECT_SETUP',
          to: 'READY_FOR_REVIEW',
        }),
      'STEP_HAS_OPEN_BLOCKING_ITEMS',
    );
  });

  it('only lets the user approve', () => {
    const s = steps({ PROJECT_SETUP: 'READY_FOR_REVIEW' });
    expectError(
      () => planStepTransition({ ...base, actor: 'AGENT', steps: s, stepKey: 'PROJECT_SETUP', to: 'APPROVED' }),
      'APPROVAL_REQUIRES_USER',
    );
    expectError(
      () => planStepTransition({ ...base, actor: 'SYSTEM', steps: s, stepKey: 'PROJECT_SETUP', to: 'APPROVED' }),
      'APPROVAL_REQUIRES_USER',
    );
    expect(planStepTransition({ ...base, steps: s, stepKey: 'PROJECT_SETUP', to: 'APPROVED' })[0].to).toBe('APPROVED');
  });

  it('lets an agent move a step to review', () => {
    const s = steps({ PROJECT_SETUP: 'IN_PROGRESS' });
    expect(
      planStepTransition({ ...base, actor: 'AGENT', steps: s, stepKey: 'PROJECT_SETUP', to: 'READY_FOR_REVIEW' })[0].to,
    ).toBe('READY_FOR_REVIEW');
  });

  it('reopening an approved step blocks every later step that had started', () => {
    const s = steps({
      PROJECT_SETUP: 'APPROVED',
      ZIS_RESEARCH: 'APPROVED',
      REQUIREMENTS_SUMMARY: 'READY_FOR_REVIEW',
      PRODUCT_INTERVIEW: 'NOT_STARTED',
    });
    const changes = planStepTransition({ ...base, steps: s, stepKey: 'PROJECT_SETUP', to: 'IN_PROGRESS' });
    expect(changes).toEqual([
      { stepKey: 'PROJECT_SETUP', from: 'APPROVED', to: 'IN_PROGRESS', reason: null },
      { stepKey: 'ZIS_RESEARCH', from: 'APPROVED', to: 'BLOCKED', reason: REOPENED_UPSTREAM_REASON },
      { stepKey: 'REQUIREMENTS_SUMMARY', from: 'READY_FOR_REVIEW', to: 'BLOCKED', reason: REOPENED_UPSTREAM_REASON },
    ]);
  });

  it('sending a step back from review does not touch later steps', () => {
    const s = steps({ PROJECT_SETUP: 'READY_FOR_REVIEW' });
    expect(planStepTransition({ ...base, steps: s, stepKey: 'PROJECT_SETUP', to: 'IN_PROGRESS' })).toHaveLength(1);
  });

  it('works regardless of input order', () => {
    const s = steps({ PROJECT_SETUP: 'APPROVED' }).reverse();
    expect(planStepTransition({ ...base, steps: s, stepKey: 'ZIS_RESEARCH', to: 'IN_PROGRESS' })[0].to).toBe(
      'IN_PROGRESS',
    );
  });

  it('rejects unknown steps', () => {
    expectError(
      () => planStepTransition({ ...base, steps: [], stepKey: 'PROJECT_SETUP', to: 'IN_PROGRESS' }),
      'STEP_NOT_FOUND',
    );
  });
});

describe('progressPercent', () => {
  it('counts approved steps only', () => {
    expect(progressPercent([])).toBe(0);
    expect(progressPercent(steps({ PROJECT_SETUP: 'APPROVED', ZIS_RESEARCH: 'READY_FOR_REVIEW' }))).toBe(7);
    expect(progressPercent(STEP_KEYS.map(() => ({ status: 'APPROVED' as const })))).toBe(100);
  });
});

describe('final package gated by BLOCKER findings', () => {
  const allDraftingApproved = (extra: Partial<Record<StepKey, StepStatus>> = {}) =>
    steps({
      ...Object.fromEntries(STEP_KEYS.slice(0, 12).map((k) => [k, 'APPROVED'])),
      ...extra,
    } as Partial<Record<StepKey, StepStatus>>);

  it('does not let step 13 start while a BLOCKER is unresolved', () => {
    expectError(
      () =>
        planStepTransition({
          ...base,
          steps: allDraftingApproved(),
          stepKey: 'FINAL_PACKAGE',
          to: 'IN_PROGRESS',
          openBlockerFindings: 1,
        }),
      'FINAL_PACKAGE_BLOCKED_BY_BLOCKER',
    );
  });

  it('does not let step 13 go to review or be approved while a BLOCKER is unresolved', () => {
    for (const [from, to] of [
      ['IN_PROGRESS', 'READY_FOR_REVIEW'],
      ['READY_FOR_REVIEW', 'APPROVED'],
    ] as const) {
      expectError(
        () =>
          planStepTransition({
            ...base,
            steps: allDraftingApproved({ FINAL_PACKAGE: from }),
            stepKey: 'FINAL_PACKAGE',
            to,
            openBlockerFindings: 2,
          }),
        'FINAL_PACKAGE_BLOCKED_BY_BLOCKER',
      );
    }
  });

  it('still allows blocking or pausing step 13, and other steps ignore BLOCKERs elsewhere', () => {
    expect(
      planStepTransition({
        ...base,
        steps: allDraftingApproved({ FINAL_PACKAGE: 'IN_PROGRESS' }),
        stepKey: 'FINAL_PACKAGE',
        to: 'WAITING_FOR_USER',
        openBlockerFindings: 1,
      })[0].to,
    ).toBe('WAITING_FOR_USER');
    expect(
      planStepTransition({
        ...base,
        steps: allDraftingApproved({ D1_FORM_DATA: 'IN_PROGRESS' }),
        stepKey: 'D1_FORM_DATA',
        to: 'READY_FOR_REVIEW',
        openBlockerFindings: 1,
      })[0].to,
    ).toBe('READY_FOR_REVIEW');
  });

  it('opens step 13 once no BLOCKER is left', () => {
    const changes = planStepTransition({
      ...base,
      steps: allDraftingApproved(),
      stepKey: 'FINAL_PACKAGE',
      to: 'IN_PROGRESS',
      openBlockerFindings: 0,
    });
    expect(changes[0]).toMatchObject({ stepKey: 'FINAL_PACKAGE', to: 'IN_PROGRESS' });
  });
});
