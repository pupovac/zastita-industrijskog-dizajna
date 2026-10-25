import { ActorType } from '@prisma/client';
import { DomainError } from './domain-error';

/**
 * Rules for adding a version to a description section (step 10). They extend the
 * confirmed-record invariant to drafted text: once the user has confirmed a section
 * ("POTVRDI tekst"), only the user may add a version — an agent gets
 * CONFIRMED_VALUE_LOCKED and has to propose the change as an open question or a
 * review finding. A version never has empty content.
 */

export interface DraftSectionState {
  confirmed: boolean;
}

export interface DraftVersionPlan {
  /** A new version is unconfirmed text; the section has to be confirmed again. */
  confirmed: false;
  verified: false;
}

export function planDraftVersion(section: DraftSectionState, actor: ActorType, content: string): DraftVersionPlan {
  if (!content.trim()) {
    throw new DomainError('DRAFT_CONTENT_EMPTY', 'Verzija sekcije mora da sadrži tekst.');
  }
  if (section.confirmed && actor !== 'USER') {
    throw new DomainError(
      'CONFIRMED_VALUE_LOCKED',
      'Potvrđen tekst sekcije može da menja samo korisnik. Predložite izmenu kao otvoreno pitanje ili nalaz provere.',
      'FORBIDDEN',
    );
  }
  return { confirmed: false, verified: false };
}
