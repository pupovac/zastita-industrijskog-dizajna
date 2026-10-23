import { describe, expect, it } from 'vitest';
import { AI_SEVERITY_ORDER, aiTargetLabel, formatUsd } from './labels';

describe('AI review labels', () => {
  it('orders severities from blocking to minor', () => {
    expect(AI_SEVERITY_ORDER).toEqual(['BLOCKER', 'VISOK', 'SREDNJI', 'NIZAK']);
  });

  it('names the target of a suggestion in Serbian and marks new records', () => {
    expect(aiTargetLabel({ entity: 'Project', id: null, field: 'applicantAddress' })).toBe('Projekat · adresa podnosioca');
    expect(aiTargetLabel({ entity: 'DesignFeature', id: null, field: 'name' })).toBe('Vizuelna karakteristika · naziv (nov zapis)');
    expect(aiTargetLabel({ entity: 'DesignFeature', id: 'abc', field: 'category' })).toBe('Vizuelna karakteristika · kategorija');
    expect(aiTargetLabel({ entity: 'D1FieldValue', id: null, field: 'PRODUCT_TITLE' })).toBe('Polje D-1 · PRODUCT_TITLE');
  });

  it('formats small costs with enough precision', () => {
    expect(formatUsd(0.0042)).toBe('$0.0042');
    expect(formatUsd(1.5)).toBe('$1.500');
    expect(formatUsd(null)).toBe('nepoznato');
  });
});
