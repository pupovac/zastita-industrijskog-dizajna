import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

/**
 * Loads the first existing `.env` file among `candidates` into `env`
 * and returns its path, or `null` when none exists.
 *
 * - Variables already present in the environment keep their value: Docker, CI
 *   and `PORT=… npm run dev` always win over the file (same rule as `node --env-file`).
 * - A missing file is not an error. Production images ship no `.env` and
 *   configure everything through the environment.
 *
 * Called once at the top of `bootstrap()` in `main.ts`, before Nest instantiates
 * `PrismaService` (which needs `DATABASE_URL`). The Prisma CLI and the
 * `node --env-file=.env` scripts load the file on their own, so only the Nest
 * entry point needs this.
 */
export function loadDotEnv(
  candidates: readonly string[] = defaultEnvCandidates(),
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  for (const file of candidates) {
    let content: string;
    try {
      content = readFileSync(file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw err;
    }
    for (const [key, value] of Object.entries(parseEnv(content))) {
      if (env[key] === undefined) env[key] = value;
    }
    return file;
  }
  return null;
}

/**
 * `apps/api/.env`, looked up from the working directory first (every npm script
 * runs with `cwd = apps/api`) and then relative to this file, which works both
 * for `dist/common/load-env.js` and `src/common/load-env.ts`.
 */
export function defaultEnvCandidates(): string[] {
  const fromCwd = resolve(process.cwd(), '.env');
  const fromAppRoot = resolve(__dirname, '..', '..', '.env');
  return fromCwd === fromAppRoot ? [fromCwd] : [fromCwd, fromAppRoot];
}
