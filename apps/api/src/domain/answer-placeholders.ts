import { DomainError } from './domain-error';

/**
 * Template markers in interview answers. Example answers are templates such as
 * "Boja je [opisno: svetlosiva]"; while an answer still contains a `[…]` marker it is
 * not the user's own statement yet, so no fact may be confirmed from it. The web UI
 * mirrors this pattern (apps/web/src/lib/answer-template.ts) for its counter.
 */
/** Up to 300 characters: some bank templates offer a whole alternative sentence inside one marker. */
export const PLACEHOLDER_PATTERN = /\[[^\[\]\n]{1,300}\]/g;

export function listPlaceholders(text: string): string[] {
  return text.match(PLACEHOLDER_PATTERN) ?? [];
}

export function countPlaceholders(text: string): number {
  return listPlaceholders(text).length;
}

/** Invariant enforced on POST /facts/:id/confirm for facts that come from an answer. */
export function assertAnswerHasNoPlaceholders(answerValue: string): void {
  const count = countPlaceholders(answerValue);
  if (count > 0) {
    throw new DomainError(
      'ANSWER_HAS_PLACEHOLDERS',
      `Odgovor još sadrži ${count} nepopunjenih oznaka […] iz šablona. Popunite ih svojim podacima pre potvrde činjenice.`,
      'CONFLICT',
    );
  }
}
