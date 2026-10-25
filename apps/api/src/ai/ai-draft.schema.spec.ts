import { AI_DRAFT_JSON_SCHEMA, AI_DRAFT_SECTION_JSON_SCHEMA, parseAiDraftResponse, parseAiDraftSectionResponse } from './ai-draft.schema';

describe('AI draft response schema', () => {
  it('accepts a complete answer', () => {
    const parsed = parseAiDraftResponse(
      JSON.stringify({
        sections: [
          { key: 'TITLE', content: 'Fasadni panel', placeholders: 0 },
          { key: 'DESCRIPTION', content: 'Panel je [POTREBNA DOPUNA: dimenzije].', placeholders: 1 },
        ],
        notes: ['Dimenzije nisu navedene u odgovorima.'],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.response.sections).toHaveLength(2);
      expect(parsed.response.notes).toEqual(['Dimenzije nisu navedene u odgovorima.']);
    }
  });

  it('rejects invalid JSON and a shape that does not match', () => {
    expect(parseAiDraftResponse('{"sections": [')).toMatchObject({ ok: false });
    const wrong = parseAiDraftResponse(JSON.stringify({ sections: [{ key: '', content: 'x', placeholders: -1 }], notes: [] }));
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toContain('ne odgovara šemi');
    expect(parseAiDraftResponse(JSON.stringify({ sections: [] })).ok).toBe(false);
  });

  it('describes the same keys in the JSON schema sent to the model', () => {
    expect(AI_DRAFT_JSON_SCHEMA.required).toEqual(['sections', 'notes']);
    expect(AI_DRAFT_JSON_SCHEMA.properties.sections.items.required).toEqual(['key', 'content', 'placeholders']);
    expect(AI_DRAFT_JSON_SCHEMA.additionalProperties).toBe(false);
  });
});

describe('AI draft section call schema (one section per call, FUZZ-145)', () => {
  it('accepts the text of one section with notes and rejects a missing field', () => {
    const ok = parseAiDraftSectionResponse(JSON.stringify({ content: 'Panel (1) je pravougaon.', placeholders: 0, notes: [] }));
    expect(ok).toMatchObject({ ok: true, response: { content: 'Panel (1) je pravougaon.', notes: [] } });
    expect(parseAiDraftSectionResponse(JSON.stringify({ content: 'x' })).ok).toBe(false);
    expect(parseAiDraftSectionResponse('{"content": "x', ).ok).toBe(false);
    expect(AI_DRAFT_SECTION_JSON_SCHEMA.required).toEqual(['content', 'placeholders', 'notes']);
    expect(Object.keys(AI_DRAFT_SECTION_JSON_SCHEMA.properties)).toEqual(['content', 'placeholders', 'notes']);
  });
});
