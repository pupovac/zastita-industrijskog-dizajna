import { DomainError } from './domain-error';
import { assertMockAllowed, isMockReference } from './mock-data';

describe('mock data separation', () => {
  it('recognizes mock references', () => {
    expect(isMockReference('MOCK')).toBe(true);
    expect(isMockReference('mock: demo seed')).toBe(true);
    expect(isMockReference('MZ-001')).toBe(false);
    expect(isMockReference('MOCKUP fotografija')).toBe(false);
    expect(isMockReference(null)).toBe(false);
  });

  it('never lets mock data into a real project', () => {
    expect(() => assertMockAllowed({ isDemo: false }, 'MOCK')).toThrow(DomainError);
    expect(() => assertMockAllowed({ isDemo: true }, 'MOCK')).not.toThrow();
    expect(() => assertMockAllowed({ isDemo: false }, 'Z-04')).not.toThrow();
  });
});
