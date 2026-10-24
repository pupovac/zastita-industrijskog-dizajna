import { DomainError } from './domain-error';
import { assertFindingUpdateAllowed, planFindingStatusChange, REVIEW_CHECKS } from './review-rules';

const now = new Date('2026-10-06T10:00:00Z');
const blocker = { type: 'FINDING' as const, status: 'OPEN' as const, severity: 'BLOCKER' as const };

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return (e as DomainError).code;
  }
  return undefined;
}

describe('review findings', () => {
  it('lists the 17 reviewer checks', () => {
    expect(REVIEW_CHECKS).toHaveLength(17);
  });

  it('lets only the user record that a finding was fixed', () => {
    expect(code(() => planFindingStatusChange(blocker, { actor: 'AGENT', to: 'RESOLVED', note: 'Opis ispravljen', now }))).toBe(
      'RESOLVE_REQUIRES_USER',
    );
    expect(planFindingStatusChange(blocker, { actor: 'USER', to: 'RESOLVED', note: 'Opis ispravljen', now })).toEqual({
      status: 'RESOLVED',
      resolutionNote: 'Opis ispravljen',
      resolvedBy: 'USER',
      resolvedAt: now,
    });
  });

  it('refuses agent resolution of any severity, not only BLOCKER', () => {
    for (const severity of ['HIGH', 'MEDIUM', 'LOW'] as const) {
      expect(code(() => planFindingStatusChange({ ...blocker, severity }, { actor: 'AGENT', to: 'RESOLVED', now }))).toBe(
        'RESOLVE_REQUIRES_USER',
      );
    }
  });

  it('lets only the user dismiss a finding, with a reason', () => {
    expect(code(() => planFindingStatusChange(blocker, { actor: 'AGENT', to: 'DISMISSED', note: 'x', now }))).toBe(
      'DISMISS_REQUIRES_USER',
    );
    expect(code(() => planFindingStatusChange(blocker, { actor: 'USER', to: 'DISMISSED', note: ' ', now }))).toBe(
      'DISMISS_REASON_REQUIRED',
    );
    expect(planFindingStatusChange(blocker, { actor: 'USER', to: 'DISMISSED', note: 'Prihvatamo rizik', now }).status).toBe(
      'DISMISSED',
    );
  });

  it('reopens a finding and clears the resolution', () => {
    expect(planFindingStatusChange({ ...blocker, status: 'RESOLVED' }, { actor: 'AGENT', to: 'OPEN', now })).toEqual({
      status: 'OPEN',
      resolutionNote: null,
      resolvedBy: null,
      resolvedAt: null,
    });
  });

  it('lets only the user lower the severity of a finding', () => {
    expect(code(() => assertFindingUpdateAllowed(blocker, { severity: 'LOW' }, 'AGENT'))).toBe('SEVERITY_DOWNGRADE_REQUIRES_USER');
    expect(code(() => assertFindingUpdateAllowed(blocker, { severity: 'HIGH' }, 'AGENT'))).toBe('SEVERITY_DOWNGRADE_REQUIRES_USER');
    expect(code(() => assertFindingUpdateAllowed({ ...blocker, severity: 'MEDIUM' }, { severity: 'LOW' }, 'AGENT'))).toBe(
      'SEVERITY_DOWNGRADE_REQUIRES_USER',
    );
    expect(code(() => assertFindingUpdateAllowed(blocker, { severity: 'LOW' }, 'USER'))).toBeUndefined();
  });

  it('lets an agent raise severity, keep it, or edit other fields', () => {
    expect(code(() => assertFindingUpdateAllowed({ ...blocker, severity: 'LOW' }, { severity: 'BLOCKER' }, 'AGENT'))).toBeUndefined();
    expect(code(() => assertFindingUpdateAllowed(blocker, { severity: 'BLOCKER' }, 'AGENT'))).toBeUndefined();
    expect(code(() => assertFindingUpdateAllowed(blocker, {}, 'AGENT'))).toBeUndefined();
  });

  it('keeps document conflicts out of the plain edit path', () => {
    expect(code(() => assertFindingUpdateAllowed({ ...blocker, type: 'CONFLICT' }, { severity: 'LOW' }, 'USER'))).toBe(
      'CONFLICT_NOT_EDITABLE',
    );
  });

  it('keeps document conflicts on their own resolution path', () => {
    expect(code(() => planFindingStatusChange({ ...blocker, type: 'CONFLICT' }, { actor: 'USER', to: 'RESOLVED', now }))).toBe(
      'CONFLICT_NEEDS_FILE_CHOICE',
    );
  });
});
