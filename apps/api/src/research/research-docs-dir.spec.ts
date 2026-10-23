import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { REQUIRED_RESEARCH_DOCS, researchDocsDir, researchDocsStatus, resolveLocalCopy } from './research-docs-dir';

describe('research docs directory', () => {
  const originalEnv = process.env.RESEARCH_DOCS_DIR;
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'zid-research-docs-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (originalEnv === undefined) delete process.env.RESEARCH_DOCS_DIR;
    else process.env.RESEARCH_DOCS_DIR = originalEnv;
  });

  it('defaults to the repository docs/ directory, which holds every required document', () => {
    delete process.env.RESEARCH_DOCS_DIR;
    expect(researchDocsDir()).toBe(resolve(__dirname, '..', '..', '..', '..', 'docs'));
    expect(researchDocsStatus()).toMatchObject({ status: 'ok', missing: [] });
  });

  it('is overridable with RESEARCH_DOCS_DIR (as set in the api image)', () => {
    process.env.RESEARCH_DOCS_DIR = tmp;
    expect(researchDocsDir()).toBe(resolve(tmp));
  });

  it('reports every required document that is missing', () => {
    expect(researchDocsStatus(tmp)).toEqual({ dir: tmp, status: 'missing', missing: [...REQUIRED_RESEARCH_DOCS] });

    mkdirSync(join(tmp, 'izvori'), { recursive: true });
    writeFileSync(join(tmp, 'izvori', 'zapisi-izvora.md'), '# Z-01');
    expect(researchDocsStatus(tmp).missing).toEqual([
      'faza-2/matrica-zahteva-zis.json',
      'faza-2/rezultati-inicijalnog-istrazivanja.md',
    ]);

    mkdirSync(join(tmp, 'faza-2'), { recursive: true });
    writeFileSync(join(tmp, 'faza-2', 'matrica-zahteva-zis.json'), '{}');
    writeFileSync(join(tmp, 'faza-2', 'rezultati-inicijalnog-istrazivanja.md'), '# A');
    expect(researchDocsStatus(tmp)).toEqual({ dir: tmp, status: 'ok', missing: [] });
  });

  it('resolves repository-relative local copies inside the docs directory, whatever its name', () => {
    const dir = join(tmp, 'research');
    expect(resolveLocalCopy('docs/izvori/web-snimci/zis.html', dir)).toBe(join(dir, 'izvori', 'web-snimci', 'zis.html'));
    expect(resolveLocalCopy('izvori/tekst/a.txt', dir)).toBe(join(dir, 'izvori', 'tekst', 'a.txt'));
    expect(resolveLocalCopy('docs/izvori/dokumenti/x.pdf', '/app/docs')).toBe(['', 'app', 'docs', 'izvori', 'dokumenti', 'x.pdf'].join(sep));
  });

  it('never serves a path outside the docs directory', () => {
    const dir = join(tmp, 'docs');
    expect(resolveLocalCopy('docs/../package.json', dir)).toBeNull();
    expect(resolveLocalCopy('../other/izvori/a.txt', dir)).toBeNull();
    expect(resolveLocalCopy('/etc/passwd', dir)).toBeNull();
    expect(resolveLocalCopy('docs/', dir)).toBeNull();
  });
});
