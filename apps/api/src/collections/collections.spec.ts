import { contentChanged, planRecordEdit } from '../domain/record-provenance';
import { COLLECTIONS } from './collections';

const config = (path: string) => {
  const found = COLLECTIONS.find((c) => c.path === path);
  if (!found) throw new Error(`no collection ${path}`);
  return found;
};

describe('collection content fields', () => {
  it('treats the delivered image and its assessment as confirmed content of a representation', () => {
    const { contentFields } = config('representations');
    const stored: Record<string, unknown> = {
      viewName: 'Perspektivni prikaz',
      uploadedFileId: null,
      assessment: 'NEEDS_REWORK',
      assessmentNote: 'Ukloniti kote.',
      verified: true,
    };
    for (const patch of [
      { assessment: 'ACCEPTABLE' },
      { assessment: 'UNSUITABLE' },
      { assessmentNote: 'agent menja razlog' },
      { uploadedFileId: 'file-1' },
    ]) {
      expect(contentChanged(stored, patch, contentFields)).toBe(true);
      expect(() => planRecordEdit({ verified: true }, 'AGENT', true)).toThrow();
    }
    // Re-sending the same assessment is not a change and keeps the confirmation.
    expect(contentChanged(stored, { assessment: 'NEEDS_REWORK' }, contentFields)).toBe(false);
  });

  it('includes the fields that feed the filing checklist for every provenanced collection', () => {
    for (const c of COLLECTIONS.filter((c) => c.provenance)) {
      expect(c.contentFields.length).toBeGreaterThan(0);
    }
  });
});
