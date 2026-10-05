import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Starts from an empty, test-only SQLite file and applies all migrations to it —
 * this also verifies that migrations work from an empty database.
 */
export default function globalSetup() {
  const apiRoot = join(__dirname, '..');
  for (const suffix of ['', '-journal']) {
    rmSync(join(apiRoot, 'prisma', `test.db${suffix}`), { force: true });
  }
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
}
