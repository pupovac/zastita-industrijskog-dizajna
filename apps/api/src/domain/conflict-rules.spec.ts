import { assertValidConflict, planConflictResolution } from './conflict-rules';
import { DomainError } from './domain-error';

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    throw e;
  }
  return undefined;
}

const now = new Date('2026-10-06T10:00:00Z');
const openConflict = { type: 'CONFLICT' as const, status: 'OPEN' as const, fileAId: 'photo', fileBId: 'drawing' };

describe('assertValidConflict', () => {
  const photo = { id: 'photo', projectId: 'p1' };
  const drawing = { id: 'drawing', projectId: 'p1' };

  it('accepts two distinct files of the same project', () => {
    expect(codeOf(() => assertValidConflict('p1', photo, drawing, 'profil ivice'))).toBeUndefined();
  });

  it('rejects the same file, foreign files and an empty attribute', () => {
    expect(codeOf(() => assertValidConflict('p1', photo, photo, 'x'))).toBe('CONFLICT_SAME_FILE');
    expect(codeOf(() => assertValidConflict('p1', photo, { id: 'd', projectId: 'p2' }, 'x'))).toBe(
      'CONFLICT_FOREIGN_FILE',
    );
    expect(codeOf(() => assertValidConflict('p1', photo, drawing, '  '))).toBe('CONFLICT_ATTRIBUTE_REQUIRED');
  });
});

describe('planConflictResolution', () => {
  it('is never resolved automatically by an agent or the system', () => {
    expect(codeOf(() => planConflictResolution(openConflict, { actor: 'AGENT', chosenFileId: 'photo', now }))).toBe(
      'CONFLICT_RESOLUTION_REQUIRES_USER',
    );
    expect(codeOf(() => planConflictResolution(openConflict, { actor: 'SYSTEM', chosenFileId: 'photo', now }))).toBe(
      'CONFLICT_RESOLUTION_REQUIRES_USER',
    );
  });

  it('records the user choice', () => {
    expect(
      planConflictResolution(openConflict, { actor: 'USER', chosenFileId: 'drawing', note: ' Crtež je aktuelan ', now }),
    ).toEqual({
      status: 'RESOLVED',
      chosenFileId: 'drawing',
      resolutionNote: 'Crtež je aktuelan',
      resolvedBy: 'USER',
      resolvedAt: now,
    });
  });

  it('rejects a choice outside the conflict', () => {
    expect(codeOf(() => planConflictResolution(openConflict, { actor: 'USER', chosenFileId: 'other', now }))).toBe(
      'CONFLICT_INVALID_CHOICE',
    );
  });

  it('rejects closed issues and non-conflicts', () => {
    expect(
      codeOf(() =>
        planConflictResolution({ ...openConflict, status: 'RESOLVED' }, { actor: 'USER', chosenFileId: 'photo', now }),
      ),
    ).toBe('CONFLICT_NOT_OPEN');
    expect(
      codeOf(() => planConflictResolution({ ...openConflict, type: 'RISK' }, { actor: 'USER', chosenFileId: 'photo', now })),
    ).toBe('NOT_A_CONFLICT');
  });
});
