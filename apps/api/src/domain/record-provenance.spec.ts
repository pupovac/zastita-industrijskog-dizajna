import { DomainError } from './domain-error';
import { contentChanged, planRecordConfirmation, planRecordEdit } from './record-provenance';

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    expect((e as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`expected DomainError ${code}`);
}

describe('record provenance', () => {
  it('locks a confirmed record against agents', () => {
    expectCode(() => planRecordEdit({ verified: true, kind: 'FACT' }, 'AGENT', true), 'CONFIRMED_VALUE_LOCKED');
  });

  it('drops the confirmation when the user changes content', () => {
    expect(planRecordEdit({ verified: true, kind: 'FACT' }, 'USER', true)).toEqual({
      verified: false,
      kind: 'USER_STATEMENT',
      sourceType: 'USER',
    });
    expect(planRecordEdit({ verified: true }, 'USER', true)).toEqual({ verified: false });
  });

  it('keeps the confirmation when nothing in the content changed', () => {
    expect(planRecordEdit({ verified: true, kind: 'FACT' }, 'AGENT', false)).toEqual({ verified: true });
  });

  it('lets only the user confirm, explicitly, once', () => {
    expectCode(
      () => planRecordConfirmation({ verified: false, kind: 'AI_INFERENCE' }, { actor: 'AGENT', explicitUserConfirmation: true }),
      'CONFIRMATION_REQUIRES_USER',
    );
    expectCode(
      () => planRecordConfirmation({ verified: false, kind: 'AI_INFERENCE' }, { actor: 'USER', explicitUserConfirmation: false }),
      'CONFIRMATION_NOT_EXPLICIT',
    );
    expectCode(
      () => planRecordConfirmation({ verified: true, kind: 'FACT' }, { actor: 'USER', explicitUserConfirmation: true }),
      'ALREADY_CONFIRMED',
    );
  });

  it('promotes an AI inference to a fact only on user confirmation', () => {
    expect(
      planRecordConfirmation({ verified: false, kind: 'AI_INFERENCE' }, { actor: 'USER', explicitUserConfirmation: true }),
    ).toEqual({ verified: true, kind: 'FACT', recordAsDecision: false });
  });

  it('adopts a recommendation as a decision instead of turning it into a fact', () => {
    expect(
      planRecordConfirmation({ verified: false, kind: 'RECOMMENDATION' }, { actor: 'USER', explicitUserConfirmation: true }),
    ).toEqual({ verified: true, kind: 'RECOMMENDATION', recordAsDecision: true });
  });

  it('confirms records without a kind', () => {
    expect(planRecordConfirmation({ verified: false }, { actor: 'USER', explicitUserConfirmation: true })).toEqual({
      verified: true,
      recordAsDecision: false,
    });
  });

  it('detects content changes only on listed fields', () => {
    const stored = { name: 'Ivica', notes: 'a' };
    expect(contentChanged(stored, { name: 'Ivica' }, ['name'])).toBe(false);
    expect(contentChanged(stored, { name: 'Profil' }, ['name'])).toBe(true);
    expect(contentChanged(stored, { notes: 'b' }, ['name'])).toBe(false);
  });
});
