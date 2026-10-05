import { ActorType, InformationKind, SourceType } from '@prisma/client';
import { DomainError } from './domain-error';

/**
 * Rules for information with provenance. The central invariant:
 * an assumption or AI inference can never become a confirmed fact without
 * an explicit confirmation by the user. Every write path in FactsService goes
 * through these functions.
 */

const EXTERNAL_SOURCES: readonly SourceType[] = ['DOCUMENT', 'ZIS', 'WIPO', 'EUIPO'];

export interface NewFactInput {
  kind: InformationKind;
  sourceType: SourceType;
  sourceReference?: string | null;
}

export interface FactState {
  kind: InformationKind;
  originKind: InformationKind;
  sourceType: SourceType;
  verified: boolean;
  confirmedBy: ActorType | null;
}

/** Validates kind/source combination for a newly recorded piece of information. */
export function assertValidNewFact(input: NewFactInput): void {
  const hasReference = Boolean(input.sourceReference?.trim());

  if (input.sourceType === 'AGENT_INFERENCE' && input.kind !== 'AI_INFERENCE' && input.kind !== 'RECOMMENDATION') {
    throw new DomainError(
      'INFERENCE_MUST_BE_LABELED',
      'Informacija čiji je izvor zaključak agenta mora biti označena kao AI ZAKLJUČAK ili PREPORUKA.',
    );
  }

  if (input.kind === 'FACT') {
    // A FACT may be recorded directly only when it comes from an identifiable external
    // source; it still starts unverified. User statements and inferences reach FACT
    // only through confirmation.
    if (!EXTERNAL_SOURCES.includes(input.sourceType) || !hasReference) {
      throw new DomainError(
        'FACT_REQUIRES_CONFIRMATION',
        'Činjenica se ne može upisati direktno. Upišite je kao izjavu ili zaključak i zatražite potvrdu korisnika.',
      );
    }
  }

  if (input.kind === 'USER_STATEMENT' && input.sourceType !== 'USER') {
    throw new DomainError('USER_STATEMENT_SOURCE', 'Izjava korisnika mora imati izvor USER.');
  }

  if (input.kind === 'LEGAL_REQUIREMENT') {
    if (!EXTERNAL_SOURCES.includes(input.sourceType) || !hasReference) {
      throw new DomainError(
        'LEGAL_REQUIREMENT_NEEDS_SOURCE',
        'Pravni zahtev mora imati zvanični izvor i referencu na dokument.',
      );
    }
  }
}

export interface ConfirmationInput {
  actor: ActorType;
  /** Must be literally `true`: the user pressed POTVRDI for this exact item. */
  explicitUserConfirmation: boolean;
  now: Date;
}

export interface ConfirmationResult {
  kind: InformationKind;
  verified: true;
  confirmedBy: 'USER';
  confirmedAt: Date;
}

/** Promotes information to a confirmed fact. Only the user can do it, explicitly. */
export function planConfirmation(fact: FactState, input: ConfirmationInput): ConfirmationResult {
  if (input.actor !== 'USER') {
    throw new DomainError('CONFIRMATION_REQUIRES_USER', 'Samo korisnik može da potvrdi činjenicu.', 'FORBIDDEN');
  }
  if (input.explicitUserConfirmation !== true) {
    throw new DomainError('CONFIRMATION_NOT_EXPLICIT', 'Potvrda mora biti eksplicitna.');
  }
  if (fact.verified) {
    throw new DomainError('ALREADY_CONFIRMED', 'Informacija je već potvrđena.', 'CONFLICT');
  }
  if (fact.kind === 'RECOMMENDATION') {
    throw new DomainError(
      'RECOMMENDATION_NOT_PROMOTABLE',
      'Preporuka se ne može pretvoriti u činjenicu. Zabeležite je kao odluku.',
      'CONFLICT',
    );
  }
  return {
    // A confirmed legal requirement stays a legal requirement; everything else becomes FACT.
    kind: fact.kind === 'LEGAL_REQUIREMENT' ? 'LEGAL_REQUIREMENT' : 'FACT',
    verified: true,
    confirmedBy: 'USER',
    confirmedAt: input.now,
  };
}

export interface ContentChange {
  actor: ActorType;
  statementChanged: boolean;
  valueChanged: boolean;
}

export interface ContentChangeResult {
  kind: InformationKind;
  verified: boolean;
  confirmedBy: ActorType | null;
  confirmedAt: Date | null;
}

/**
 * Changing the content of a piece of information.
 * - Nobody but the user may change a confirmed value.
 * - Any content change drops the confirmation; the user must confirm again.
 * - A user edit of a confirmed FACT turns it back into a user statement.
 */
export function planContentChange(fact: FactState & { confirmedAt: Date | null }, change: ContentChange): ContentChangeResult {
  const contentChanged = change.statementChanged || change.valueChanged;
  if (!contentChanged) {
    return { kind: fact.kind, verified: fact.verified, confirmedBy: fact.confirmedBy, confirmedAt: fact.confirmedAt };
  }
  if (fact.verified && change.actor !== 'USER') {
    throw new DomainError(
      'CONFIRMED_VALUE_LOCKED',
      'Potvrđena vrednost se ne može menjati bez korisnika. Predložite izmenu kao otvoreno pitanje.',
      'FORBIDDEN',
    );
  }
  let kind = fact.kind;
  if (fact.kind === 'FACT' && change.actor === 'USER' && fact.sourceType === 'USER') {
    kind = 'USER_STATEMENT';
  } else if (fact.kind === 'FACT' && fact.originKind !== 'FACT') {
    kind = fact.originKind;
  }
  return { kind, verified: false, confirmedBy: null, confirmedAt: null };
}

/** True only for information carrying the "POTVRĐENA ČINJENICA KORISNIKA" status. */
export function isConfirmedUserFact(fact: Pick<FactState, 'kind' | 'verified' | 'confirmedBy'>): boolean {
  return fact.kind === 'FACT' && fact.verified && fact.confirmedBy === 'USER';
}
