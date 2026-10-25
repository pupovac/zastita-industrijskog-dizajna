import { groupFileVersions, isCurrentFile } from './file-versions';

const at = (iso: string) => new Date(iso);
const file = (id: string, originalName: string, createdAt: string, replacedById: string | null = null) => ({
  id,
  originalName,
  createdAt: at(createdAt),
  replacedById,
});

describe('groupFileVersions', () => {
  it('keeps files that were never replaced, without previous versions', () => {
    const files = [file('a', 'crtez.pdf', '2026-10-01'), file('b', 'skica.svg', '2026-10-02')];
    expect(groupFileVersions(files)).toEqual([
      { ...files[0], previousVersions: [] },
      { ...files[1], previousVersions: [] },
    ]);
  });

  it('hides a replaced file and lists it as the previous version of its replacement', () => {
    const old = file('old', 'panel-pozadi.png', '2026-10-01', 'new');
    const next = file('new', 'panel-spreda.png', '2026-10-02');
    const other = file('x', 'specifikacija.docx', '2026-10-03');

    const grouped = groupFileVersions([old, next, other]);

    expect(grouped.map((f) => f.id)).toEqual(['new', 'x']);
    expect(grouped[0].previousVersions).toEqual([
      { id: 'old', originalName: 'panel-pozadi.png', createdAt: at('2026-10-01') },
    ]);
    expect(grouped[1].previousVersions).toEqual([]);
  });

  it('follows a chain of several replacements, oldest first', () => {
    const v1 = file('v1', 'v1.png', '2026-10-01', 'v2');
    const v2 = file('v2', 'v2.png', '2026-10-02', 'v3');
    const v3 = file('v3', 'v3.png', '2026-10-03');

    const [current] = groupFileVersions([v3, v1, v2]);

    expect(current.id).toBe('v3');
    expect(current.previousVersions.map((v) => v.id)).toEqual(['v1', 'v2']);
  });

  it('drops a replaced file whose replacement is gone', () => {
    const orphan = file('old', 'stari.png', '2026-10-01', 'deleted');
    expect(groupFileVersions([orphan])).toEqual([]);
  });

  it('does not loop on inconsistent circular pointers', () => {
    const a = file('a', 'a.png', '2026-10-01', 'b');
    const b = file('b', 'b.png', '2026-10-02', 'a');
    const c = file('c', 'c.png', '2026-10-03');
    expect(groupFileVersions([a, b, c]).map((f) => f.id)).toEqual(['c']);
  });
});

describe('isCurrentFile', () => {
  it('is true only when the file has not been replaced', () => {
    expect(isCurrentFile({ id: 'a', replacedById: null })).toBe(true);
    expect(isCurrentFile({ id: 'a', replacedById: 'b' })).toBe(false);
  });
});
