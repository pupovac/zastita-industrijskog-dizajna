/**
 * Violation of a business invariant. Messages are user-facing (Serbian, Latin script);
 * codes are stable identifiers for clients and tests.
 */
export type DomainErrorKind = 'FORBIDDEN' | 'INVALID' | 'CONFLICT' | 'NOT_FOUND';

export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly kind: DomainErrorKind = 'INVALID',
    /** Extra fields for the client (e.g. the id of the record that is in the way); serialised next to `code`. */
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
