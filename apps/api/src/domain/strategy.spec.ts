import { DomainError } from './domain-error';
import { assertValidStrategyValue, parseRequirementRefs } from './strategy';

describe('protection strategy', () => {
  it('accepts only the listed values for typed items', () => {
    expect(() => assertValidStrategyValue('FILING_TYPE', 'MULTIPLE')).not.toThrow();
    expect(() => assertValidStrategyValue('FILING_TYPE', 'MANY')).toThrow(DomainError);
    expect(() => assertValidStrategyValue('VARIANT_RESOLUTION', 'slobodan tekst')).not.toThrow();
    expect(() => assertValidStrategyValue('DEFERRED_PUBLICATION', '')).not.toThrow();
  });

  it('parses matrix references and rejects anything else', () => {
    expect(parseRequirementRefs('MZ-120, mz-123; NS-03')).toEqual(['MZ-120', 'MZ-123', 'NS-03']);
    expect(parseRequirementRefs('')).toEqual([]);
    expect(() => parseRequirementRefs('član 18')).toThrow(DomainError);
  });
});
