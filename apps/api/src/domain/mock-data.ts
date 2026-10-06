import { DomainError } from './domain-error';

/**
 * Mock data exists only for the demo project. Every mock record carries
 * `sourceReference: "MOCK"` (optionally "MOCK: …"), and a real project never accepts one.
 */
export const MOCK_REFERENCE = 'MOCK';
export const DEMO_PROJECT_NAME = '[DEMO] EPS fasadni panel – mock podaci';
export const DEMO_BANNER = 'DEMO – izmišljeni podaci, ne koristiti za prijavu';

export function isMockReference(reference: string | null | undefined): boolean {
  const value = reference?.trim().toUpperCase() ?? '';
  return value === MOCK_REFERENCE || value.startsWith(`${MOCK_REFERENCE}:`);
}

export function assertMockAllowed(project: { isDemo: boolean }, reference: string | null | undefined): void {
  if (!project.isDemo && isMockReference(reference)) {
    throw new DomainError(
      'MOCK_DATA_IN_REAL_PROJECT',
      'Mock podaci se mogu upisati samo u demo projekat, nikada u stvarni projekat.',
    );
  }
}
