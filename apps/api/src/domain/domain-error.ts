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
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
