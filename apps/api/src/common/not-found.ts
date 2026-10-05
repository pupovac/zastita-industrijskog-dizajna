import { DomainError } from '../domain/domain-error';

export function orNotFound<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) {
    throw new DomainError('NOT_FOUND', `${what} nije pronađen(a).`, 'NOT_FOUND');
  }
  return value;
}
