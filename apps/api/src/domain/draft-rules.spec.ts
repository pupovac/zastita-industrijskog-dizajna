import { DomainError } from './domain-error';
import { planDraftVersion } from './draft-rules';

function expectCode(fn: () => unknown, code: string, kind: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    expect((e as DomainError).code).toBe(code);
    expect((e as DomainError).kind).toBe(kind);
    return;
  }
  throw new Error(`expected DomainError ${code}`);
}

describe('draft version rules', () => {
  it('lets anyone add a version to an unconfirmed section; the section stays unconfirmed', () => {
    expect(planDraftVersion({ confirmed: false }, 'AGENT', 'Panel pravougaonog oblika.')).toEqual({ confirmed: false, verified: false });
    expect(planDraftVersion({ confirmed: false }, 'USER', 'Panel pravougaonog oblika.')).toEqual({ confirmed: false, verified: false });
  });

  it('locks a confirmed section against agents', () => {
    expectCode(() => planDraftVersion({ confirmed: true }, 'AGENT', 'Nova verzija posle potvrde'), 'CONFIRMED_VALUE_LOCKED', 'FORBIDDEN');
  });

  it('drops the confirmation when the user adds a version to a confirmed section', () => {
    expect(planDraftVersion({ confirmed: true }, 'USER', 'Ispravljen tekst.')).toEqual({ confirmed: false, verified: false });
  });

  it('refuses a version without text, whoever sends it', () => {
    expectCode(() => planDraftVersion({ confirmed: false }, 'USER', ''), 'DRAFT_CONTENT_EMPTY', 'INVALID');
    expectCode(() => planDraftVersion({ confirmed: false }, 'AGENT', '   \n\t'), 'DRAFT_CONTENT_EMPTY', 'INVALID');
  });

  it('checks the content before the lock, so an empty agent version on a confirmed section is reported as empty', () => {
    expectCode(() => planDraftVersion({ confirmed: true }, 'AGENT', ''), 'DRAFT_CONTENT_EMPTY', 'INVALID');
  });
});
