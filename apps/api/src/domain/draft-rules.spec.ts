import { DomainError } from './domain-error';
import { countPlaceholders, listPlaceholders, planDraftVersion, planSectionConfirmation } from './draft-rules';

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

describe('AI draft over a confirmed section', () => {
  it('stays locked for agent text unless the user explicitly chose to replace it', () => {
    expectCode(() => planDraftVersion({ confirmed: true }, 'AGENT', 'AI nacrt', {}), 'CONFIRMED_VALUE_LOCKED', 'FORBIDDEN');
    expectCode(() => planDraftVersion({ confirmed: true }, 'AGENT', 'AI nacrt', { explicitUserReplacement: false }), 'CONFIRMED_VALUE_LOCKED', 'FORBIDDEN');
    expect(planDraftVersion({ confirmed: true }, 'AGENT', 'AI nacrt', { explicitUserReplacement: true })).toEqual({ confirmed: false, verified: false });
  });
});

describe('„[POTREBNA DOPUNA]" markers', () => {
  it('counts markers regardless of case, spacing and explanation', () => {
    expect(countPlaceholders('Panel ima [POTREBNA DOPUNA: dimenzije] i [potrebna dopuna: boja varijante B].')).toBe(2);
    expect(countPlaceholders('[ POTREBNA  DOPUNA ]')).toBe(1);
    expect(countPlaceholders('[POTREBNA DOPUNA]')).toBe(1);
    expect(countPlaceholders('Potrebna dopuna teksta bez zagrada.')).toBe(0);
    expect(listPlaceholders('a [POTREBNA DOPUNA: visina] b')).toEqual(['[POTREBNA DOPUNA: visina]']);
  });
});

describe('section confirmation', () => {
  it('is reserved for the user and must be explicit', () => {
    expectCode(() => planSectionConfirmation({ confirmed: false }, 'Tekst.', 'AGENT', true), 'CONFIRMATION_REQUIRES_USER', 'FORBIDDEN');
    expectCode(() => planSectionConfirmation({ confirmed: false }, 'Tekst.', 'USER', false), 'CONFIRMATION_NOT_EXPLICIT', 'INVALID');
  });

  it('refuses an empty or already confirmed section', () => {
    expectCode(() => planSectionConfirmation({ confirmed: false }, '  ', 'USER', true), 'SECTION_EMPTY', 'CONFLICT');
    expectCode(() => planSectionConfirmation({ confirmed: false }, null, 'USER', true), 'SECTION_EMPTY', 'CONFLICT');
    expectCode(() => planSectionConfirmation({ confirmed: true }, 'Tekst.', 'USER', true), 'ALREADY_CONFIRMED', 'CONFLICT');
  });

  it('blocks confirmation while a „[POTREBNA DOPUNA]" marker is in the text', () => {
    expectCode(
      () => planSectionConfirmation({ confirmed: false }, 'Panel je [POTREBNA DOPUNA: boja] boje.', 'USER', true),
      'SECTION_HAS_PLACEHOLDERS',
      'CONFLICT',
    );
    expect(planSectionConfirmation({ confirmed: false }, 'Panel je bele boje.', 'USER', true)).toEqual({ confirmed: true, verified: true });
  });
});
