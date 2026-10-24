import { AI_REVIEW_JSON_SCHEMA, parseAiReviewResponse } from './ai-review.schema';

const valid = {
  summary: 'Korak je delimično popunjen.',
  findings: [
    { severity: 'VISOK', title: 'Nedostaje adresa podnosioca', detail: 'Polje je prazno.', relatedRequirement: 'mz-146', relatedField: 'Project.applicantAddress' },
  ],
  suggestions: [
    {
      target: { entity: 'Project', id: null, field: 'applicantAddress' },
      proposedValue: 'Izmišljena 1, Beograd',
      rationale: 'Iz odgovora na pitanje A1.',
      requirementRef: null,
    },
  ],
  openQuestions: ['Da li podnosilac ima zastupnika?'],
};

describe('AI review response schema', () => {
  it('accepts a valid response and normalises matrix codes', () => {
    const result = parseAiReviewResponse(JSON.stringify(valid));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.response.findings[0].relatedRequirement).toBe('MZ-146');
    expect(result.response.suggestions[0].target.id).toBeNull();
  });

  it('turns invalid JSON into an error result instead of throwing', () => {
    const result = parseAiReviewResponse('{"summary": "nedovršeno');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('nije validan JSON');
  });

  it('rejects an unknown severity or entity', () => {
    const badSeverity = { ...valid, findings: [{ ...valid.findings[0], severity: 'CRITICAL' }] };
    expect(parseAiReviewResponse(JSON.stringify(badSeverity))).toMatchObject({ ok: false });
    const badEntity = { ...valid, suggestions: [{ ...valid.suggestions[0], target: { entity: 'Patent', id: null, field: 'x' } }] };
    const result = parseAiReviewResponse(JSON.stringify(badEntity));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('suggestions.0.target.entity');
  });

  it('rejects a response with a missing block', () => {
    const { openQuestions: _omit, ...withoutQuestions } = valid;
    expect(parseAiReviewResponse(JSON.stringify(withoutQuestions))).toMatchObject({ ok: false });
  });

  it('keeps the JSON schema closed (additionalProperties false, all keys required) as structured outputs demand', () => {
    const check = (schema: Record<string, unknown>) => {
      if (schema.type === 'object') {
        expect(schema.additionalProperties).toBe(false);
        const properties = schema.properties as Record<string, Record<string, unknown>>;
        expect([...(schema.required as string[])].sort()).toEqual(Object.keys(properties).sort());
        for (const property of Object.values(properties)) check(property);
      }
      if (schema.type === 'array') check(schema.items as Record<string, unknown>);
    };
    check(AI_REVIEW_JSON_SCHEMA as unknown as Record<string, unknown>);
  });
});
