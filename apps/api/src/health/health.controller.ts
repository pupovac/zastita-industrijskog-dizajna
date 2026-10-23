import { Controller, Get } from '@nestjs/common';
import { researchDocsStatus } from '../research/research-docs-dir';

/**
 * Liveness/readiness probe target. With the global `/api` prefix this is
 * reachable at `GET /api/healthz`. Deliberately does NOT touch the database:
 * it answers "the HTTP server is up" so a transient DB hiccup does not cause
 * Kubernetes to kill an otherwise-serving pod. Prisma migrations run at
 * startup (entrypoint) before the server listens, so readiness implies the
 * schema is applied.
 *
 * `researchDocs` reports whether the research documents the import reads
 * (`docs/`, see RESEARCH_DOCS_DIR) are present in this deployment, so a build
 * that forgot them is visible right after deploy instead of on the first
 * click. It is informational: a missing directory does not fail the probe.
 */
@Controller()
export class HealthController {
  @Get('healthz')
  healthz() {
    const docs = researchDocsStatus();
    return {
      status: 'ok',
      researchDocs: docs.status,
      ...(docs.missing.length > 0 ? { researchDocsMissing: docs.missing } : {}),
    };
  }
}
