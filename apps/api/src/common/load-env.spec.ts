import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultEnvCandidates, loadDotEnv } from './load-env';

describe('loadDotEnv', () => {
  let dir: string;
  const keys = ['ZID_TEST_FROM_FILE', 'ZID_TEST_PRESET'];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'zid-load-env-'));
    for (const key of keys) delete process.env[key];
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    for (const key of keys) delete process.env[key];
  });

  it('loads the first existing candidate and reports which one', () => {
    const missing = join(dir, 'missing.env');
    const present = join(dir, '.env');
    writeFileSync(present, 'ZID_TEST_FROM_FILE="file:./dev.db"\n');

    expect(loadDotEnv([missing, present])).toBe(present);
    expect(process.env.ZID_TEST_FROM_FILE).toBe('file:./dev.db');
  });

  it('never overrides a variable that is already set in the environment', () => {
    process.env.ZID_TEST_PRESET = 'from-environment';
    const present = join(dir, '.env');
    writeFileSync(present, 'ZID_TEST_PRESET=from-file\nZID_TEST_FROM_FILE=from-file\n');

    loadDotEnv([present]);

    expect(process.env.ZID_TEST_PRESET).toBe('from-environment');
    expect(process.env.ZID_TEST_FROM_FILE).toBe('from-file');
  });

  it('returns null and leaves the environment untouched when no file exists', () => {
    expect(loadDotEnv([join(dir, 'a.env'), join(dir, 'b.env')])).toBeNull();
    expect(process.env.ZID_TEST_FROM_FILE).toBeUndefined();
  });

  it('rethrows errors other than a missing file', () => {
    const notAFile = join(dir, 'dir.env');
    mkdirSync(notAFile);

    expect(() => loadDotEnv([notAFile])).toThrow();
  });

  it('writes into the env object it is given', () => {
    const present = join(dir, '.env');
    writeFileSync(present, 'DATABASE_URL="file:./dev.db"\nPORT=3000\n');
    const env: NodeJS.ProcessEnv = { PORT: '3100' };

    expect(loadDotEnv([present], env)).toBe(present);
    expect(env).toEqual({ DATABASE_URL: 'file:./dev.db', PORT: '3100' });
  });

  it('looks for apps/api/.env next to the working directory and the app root', () => {
    const candidates = defaultEnvCandidates();
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    for (const candidate of candidates) expect(candidate.endsWith('.env')).toBe(true);
    expect(new Set(candidates).size).toBe(candidates.length);
  });
});
