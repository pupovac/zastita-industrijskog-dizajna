import { existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

/** Files the phase 1–2 import reads, relative to the research docs directory. All must exist. */
export const REQUIRED_RESEARCH_DOCS = [
  'izvori/zapisi-izvora.md',
  'faza-2/matrica-zahteva-zis.json',
  'faza-2/rezultati-inicijalnog-istrazivanja.md',
] as const;

/**
 * Directory holding the research documents — the repository `docs/` on a local checkout.
 * Overridable with RESEARCH_DOCS_DIR; the api image copies `docs/` to /app/docs and sets it.
 */
export function researchDocsDir(): string {
  return resolve(process.env.RESEARCH_DOCS_DIR ?? join(__dirname, '..', '..', '..', '..', 'docs'));
}

export interface ResearchDocsStatus {
  dir: string;
  status: 'ok' | 'missing';
  /** Required files (relative to `dir`) that are not present. */
  missing: string[];
}

/** Whether every document the import needs is present; reported by `GET /api/healthz`. */
export function researchDocsStatus(dir: string = researchDocsDir()): ResearchDocsStatus {
  const missing = REQUIRED_RESEARCH_DOCS.filter((file) => !existsSync(join(dir, file)));
  return { dir, status: missing.length === 0 ? 'ok' : 'missing', missing };
}

/**
 * Absolute path of a local copy of a source. The source records reference copies as
 * repository-relative paths (`docs/izvori/...`); they are resolved inside the research docs
 * directory wherever it lives (checkout `docs/`, `/app/docs` in the image, RESEARCH_DOCS_DIR).
 * Returns null when the path would escape that directory.
 */
export function resolveLocalCopy(relative: string, dir: string = researchDocsDir()): string | null {
  const inside = relative.replace(/^docs\//, '');
  const full = resolve(dir, inside);
  return full.startsWith(dir + sep) ? full : null;
}
