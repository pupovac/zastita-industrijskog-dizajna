import { Controller, Get } from '@nestjs/common';

/**
 * Liveness/readiness probe target. With the global `/api` prefix this is
 * reachable at `GET /api/healthz`. Deliberately does NOT touch the database:
 * it answers "the HTTP server is up" so a transient DB hiccup does not cause
 * Kubernetes to kill an otherwise-serving pod. Prisma migrations run at
 * startup (entrypoint) before the server listens, so readiness implies the
 * schema is applied.
 */
@Controller()
export class HealthController {
  @Get('healthz')
  healthz() {
    return { status: 'ok' };
  }
}
