import { ActorType } from '@prisma/client';
import { DomainError } from './domain-error';

/**
 * Rules for adding a version to a description section (step 10). They extend the
 * confirmed-record invariant to drafted text: once the user has confirmed a section
 * ("POTVRDI tekst"), only the user may add a version — an agent gets
 * CONFIRMED_VALUE_LOCKED and has to propose the change as an open question or a
 * review finding. A version never has empty content.
 *
 * An AI draft (FUZZ-142) is agent text even though the user pressed the button. It may
 * replace a confirmed section only when the user explicitly decided so
 * (`explicitUserReplacement`) — the UI asks „Sekcija X je potvrđena. Zameniti radnom verzijom?".
 */

export interface DraftSectionState {
  confirmed: boolean;
}

export interface DraftVersionPlan {
  /** A new version is unconfirmed text; the section has to be confirmed again. */
  confirmed: false;
  verified: false;
}

export interface DraftVersionOptions {
  /** The user explicitly chose to replace a confirmed section with agent text. */
  explicitUserReplacement?: boolean;
}

export function planDraftVersion(section: DraftSectionState, actor: ActorType, content: string, options: DraftVersionOptions = {}): DraftVersionPlan {
  if (!content.trim()) {
    throw new DomainError('DRAFT_CONTENT_EMPTY', 'Verzija sekcije mora da sadrži tekst.');
  }
  if (section.confirmed && actor !== 'USER' && options.explicitUserReplacement !== true) {
    throw new DomainError(
      'CONFIRMED_VALUE_LOCKED',
      'Potvrđen tekst sekcije može da menja samo korisnik. Predložite izmenu kao otvoreno pitanje ili nalaz provere.',
      'FORBIDDEN',
    );
  }
  return { confirmed: false, verified: false };
}

/**
 * Marker the AI leaves where data is missing instead of inventing it:
 * „[POTREBNA DOPUNA: šta nedostaje]". Case-insensitive, tolerant to spacing; the
 * colon and the explanation are optional so a bare „[POTREBNA DOPUNA]" counts too.
 */
export const PLACEHOLDER_PATTERN = /\[\s*POTREBNA\s+DOPUNA\b[^\]]*\]/giu;

export function countPlaceholders(content: string): number {
  return content.match(PLACEHOLDER_PATTERN)?.length ?? 0;
}

export function listPlaceholders(content: string): string[] {
  return content.match(PLACEHOLDER_PATTERN) ?? [];
}

/**
 * POTVRDI for a section. Only the user confirms, explicitly, a non-empty text that is not
 * already confirmed — and never a text that still carries a „[POTREBNA DOPUNA]" marker:
 * confirming it would turn a declared gap into a „confirmed" section of the application.
 */
export function planSectionConfirmation(
  section: DraftSectionState,
  latestContent: string | null | undefined,
  actor: ActorType,
  explicitUserConfirmation: boolean,
): { confirmed: true; verified: true } {
  if (actor !== 'USER') {
    throw new DomainError('CONFIRMATION_REQUIRES_USER', 'Samo korisnik može da potvrdi tekst.', 'FORBIDDEN');
  }
  if (explicitUserConfirmation !== true) {
    throw new DomainError('CONFIRMATION_NOT_EXPLICIT', 'Potvrda mora biti eksplicitna.');
  }
  if (!latestContent?.trim()) {
    throw new DomainError('SECTION_EMPTY', 'Sekcija nema tekst koji bi se mogao potvrditi.', 'CONFLICT');
  }
  if (section.confirmed) throw new DomainError('ALREADY_CONFIRMED', 'Sekcija je već potvrđena.', 'CONFLICT');
  const placeholders = countPlaceholders(latestContent);
  if (placeholders > 0) {
    throw new DomainError(
      'SECTION_HAS_PLACEHOLDERS',
      `Tekst sadrži ${placeholders} ${placeholders === 1 ? 'marker' : 'markera'} „[POTREBNA DOPUNA]". Dopunite nedostajuće podatke pre potvrde.`,
      'CONFLICT',
    );
  }
  return { confirmed: true, verified: true };
}
