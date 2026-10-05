import { DomainError } from './domain-error';
import { assertValidNewFact, FactState, isConfirmedUserFact, planConfirmation, planContentChange } from './fact-rules';

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

function fact(overrides: Partial<FactState & { confirmedAt: Date | null }> = {}) {
  return {
    kind: 'AI_INFERENCE' as const,
    originKind: 'AI_INFERENCE' as const,
    sourceType: 'AGENT_INFERENCE' as const,
    verified: false,
    confirmedBy: null,
    confirmedAt: null,
    ...overrides,
  };
}

describe('assertValidNewFact', () => {
  it('requires agent inferences to be labeled as inference or recommendation', () => {
    expect(codeOf(() => assertValidNewFact({ kind: 'FACT', sourceType: 'AGENT_INFERENCE', sourceReference: 'x' }))).toBe(
      'INFERENCE_MUST_BE_LABELED',
    );
    expect(codeOf(() => assertValidNewFact({ kind: 'USER_STATEMENT', sourceType: 'AGENT_INFERENCE' }))).toBe(
      'INFERENCE_MUST_BE_LABELED',
    );
    expect(codeOf(() => assertValidNewFact({ kind: 'AI_INFERENCE', sourceType: 'AGENT_INFERENCE' }))).toBeUndefined();
    expect(codeOf(() => assertValidNewFact({ kind: 'RECOMMENDATION', sourceType: 'AGENT_INFERENCE' }))).toBeUndefined();
  });

  it('never lets a user statement be recorded directly as a FACT', () => {
    expect(codeOf(() => assertValidNewFact({ kind: 'FACT', sourceType: 'USER', sourceReference: 'odgovor' }))).toBe(
      'FACT_REQUIRES_CONFIRMATION',
    );
  });

  it('accepts an unverified FACT only from a referenced external source', () => {
    expect(codeOf(() => assertValidNewFact({ kind: 'FACT', sourceType: 'DOCUMENT' }))).toBe('FACT_REQUIRES_CONFIRMATION');
    expect(
      codeOf(() => assertValidNewFact({ kind: 'FACT', sourceType: 'DOCUMENT', sourceReference: 'crtez.pdf, str. 2' })),
    ).toBeUndefined();
  });

  it('requires USER source for user statements', () => {
    expect(codeOf(() => assertValidNewFact({ kind: 'USER_STATEMENT', sourceType: 'DOCUMENT' }))).toBe(
      'USER_STATEMENT_SOURCE',
    );
    expect(codeOf(() => assertValidNewFact({ kind: 'USER_STATEMENT', sourceType: 'USER' }))).toBeUndefined();
  });

  it('requires an official, referenced source for legal requirements', () => {
    expect(codeOf(() => assertValidNewFact({ kind: 'LEGAL_REQUIREMENT', sourceType: 'USER', sourceReference: 'x' }))).toBe(
      'LEGAL_REQUIREMENT_NEEDS_SOURCE',
    );
    expect(codeOf(() => assertValidNewFact({ kind: 'LEGAL_REQUIREMENT', sourceType: 'ZIS', sourceReference: ' ' }))).toBe(
      'LEGAL_REQUIREMENT_NEEDS_SOURCE',
    );
    expect(
      codeOf(() =>
        assertValidNewFact({ kind: 'LEGAL_REQUIREMENT', sourceType: 'ZIS', sourceReference: 'https://www.zis.gov.rs/' }),
      ),
    ).toBeUndefined();
  });
});

describe('planConfirmation', () => {
  it('refuses promotion of an AI inference by an agent', () => {
    expect(codeOf(() => planConfirmation(fact(), { actor: 'AGENT', explicitUserConfirmation: true, now }))).toBe(
      'CONFIRMATION_REQUIRES_USER',
    );
    expect(codeOf(() => planConfirmation(fact(), { actor: 'SYSTEM', explicitUserConfirmation: true, now }))).toBe(
      'CONFIRMATION_REQUIRES_USER',
    );
  });

  it('refuses promotion without explicit confirmation', () => {
    expect(codeOf(() => planConfirmation(fact(), { actor: 'USER', explicitUserConfirmation: false, now }))).toBe(
      'CONFIRMATION_NOT_EXPLICIT',
    );
  });

  it('promotes an AI inference to a confirmed user fact on explicit user confirmation', () => {
    const result = planConfirmation(fact(), { actor: 'USER', explicitUserConfirmation: true, now });
    expect(result).toEqual({ kind: 'FACT', verified: true, confirmedBy: 'USER', confirmedAt: now });
    expect(isConfirmedUserFact(result)).toBe(true);
  });

  it('promotes a user statement on confirmation', () => {
    const result = planConfirmation(fact({ kind: 'USER_STATEMENT', originKind: 'USER_STATEMENT', sourceType: 'USER' }), {
      actor: 'USER',
      explicitUserConfirmation: true,
      now,
    });
    expect(result.kind).toBe('FACT');
  });

  it('keeps a legal requirement a legal requirement after confirmation', () => {
    const result = planConfirmation(fact({ kind: 'LEGAL_REQUIREMENT', originKind: 'LEGAL_REQUIREMENT', sourceType: 'ZIS' }), {
      actor: 'USER',
      explicitUserConfirmation: true,
      now,
    });
    expect(result.kind).toBe('LEGAL_REQUIREMENT');
    expect(isConfirmedUserFact(result)).toBe(false);
  });

  it('never turns a recommendation into a fact', () => {
    expect(
      codeOf(() =>
        planConfirmation(fact({ kind: 'RECOMMENDATION', originKind: 'RECOMMENDATION' }), {
          actor: 'USER',
          explicitUserConfirmation: true,
          now,
        }),
      ),
    ).toBe('RECOMMENDATION_NOT_PROMOTABLE');
  });

  it('rejects double confirmation', () => {
    expect(
      codeOf(() =>
        planConfirmation(fact({ kind: 'FACT', verified: true, confirmedBy: 'USER' }), {
          actor: 'USER',
          explicitUserConfirmation: true,
          now,
        }),
      ),
    ).toBe('ALREADY_CONFIRMED');
  });
});

describe('planContentChange', () => {
  const confirmedInference = fact({ kind: 'FACT', verified: true, confirmedBy: 'USER', confirmedAt: now });

  it('locks confirmed values against agents', () => {
    expect(
      codeOf(() => planContentChange(confirmedInference, { actor: 'AGENT', statementChanged: false, valueChanged: true })),
    ).toBe('CONFIRMED_VALUE_LOCKED');
  });

  it('drops confirmation when the user edits a confirmed value', () => {
    const result = planContentChange(confirmedInference, { actor: 'USER', statementChanged: false, valueChanged: true });
    expect(result).toEqual({ kind: 'AI_INFERENCE', verified: false, confirmedBy: null, confirmedAt: null });
  });

  it('turns an edited confirmed user fact back into a user statement', () => {
    const userFact = fact({
      kind: 'FACT',
      originKind: 'USER_STATEMENT',
      sourceType: 'USER',
      verified: true,
      confirmedBy: 'USER',
      confirmedAt: now,
    });
    expect(planContentChange(userFact, { actor: 'USER', statementChanged: true, valueChanged: false }).kind).toBe(
      'USER_STATEMENT',
    );
  });

  it('lets an agent refine its own unconfirmed inference without promoting it', () => {
    const result = planContentChange(fact(), { actor: 'AGENT', statementChanged: true, valueChanged: true });
    expect(result).toEqual({ kind: 'AI_INFERENCE', verified: false, confirmedBy: null, confirmedAt: null });
  });

  it('keeps state when content does not change', () => {
    expect(planContentChange(confirmedInference, { actor: 'AGENT', statementChanged: false, valueChanged: false })).toEqual(
      { kind: 'FACT', verified: true, confirmedBy: 'USER', confirmedAt: now },
    );
  });
});
