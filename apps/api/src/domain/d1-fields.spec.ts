import { D1_FIELDS, d1FieldStates } from './d1-fields';

describe('D-1 fields', () => {
  it('covers fields 1–10, attachments and signature', () => {
    expect(D1_FIELDS.map((f) => f.number)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Prilozi', 'Potpis']);
  });

  it('flags missing values and filing-only fields', () => {
    const states = d1FieldStates([
      { fieldKey: 'APPLICANT', value: 'Firma d.o.o.', deferredToFiling: null },
      { fieldKey: 'PRIORITY', value: '', deferredToFiling: true },
    ]);
    const byKey = Object.fromEntries(states.map((s) => [s.key, s]));
    expect(states).toHaveLength(D1_FIELDS.length);
    expect(byKey.APPLICANT).toMatchObject({ missing: false, deferredToFiling: false });
    expect(byKey.FEES).toMatchObject({ missing: true, deferredToFiling: true });
    expect(byKey.PRIORITY).toMatchObject({ missing: true, deferredToFiling: true });
  });
});
