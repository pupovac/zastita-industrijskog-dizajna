import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AiReviewService } from '../ai/ai-review.service';
import { AppModule } from '../app.module';
import { DEMO_PROJECT_NAME } from '../domain/mock-data';
import { isStepKey } from '../domain/steps';
import { PrismaService } from '../prisma/prisma.service';

/**
 * npm run ai:smoke [-- <STEP_KEY> [<STEP_KEY> ...]]
 *
 * One real call per step against the DEMO project (ANTHROPIC_API_KEY from apps/api/.env).
 * Prints tokens, cache hits and the estimated cost, so the numbers can be reported.
 * Run it twice: the second run should show cache_read_input_tokens > 0.
 */
async function main() {
  const steps = process.argv.slice(2).filter(isStepKey);
  if (steps.length === 0) steps.push('VISUAL_ANALYSIS');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const prisma = app.get(PrismaService);
    const demo = await prisma.project.findFirst({ where: { isDemo: true, name: DEMO_PROJECT_NAME } });
    if (!demo) throw new Error('Demo projekat ne postoji. Pokrenite prvo: npm run db:seed:demo');
    const reviews = app.get(AiReviewService);
    for (const step of steps) {
      const started = Date.now();
      const review = await reviews.review(demo.id, step);
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`\n=== ${step} · ${review.status} · ${review.model} · ${seconds}s`);
      console.log(
        `tokens: input=${review.inputTokens} output=${review.outputTokens} cache_read=${review.cacheReadTokens} cache_write=${review.cacheCreationTokens}` +
          ` · est. cost: ${review.estimatedCostUsd === null ? 'nepoznato' : `$${review.estimatedCostUsd.toFixed(4)}`}`,
      );
      if (review.errorMessage) console.log(`error: ${review.errorMessage}`);
      if (review.summary) console.log(`summary: ${review.summary}`);
      for (const f of review.findings) console.log(`- [${f.severity}] ${f.title}${f.relatedRequirement ? ` (${f.relatedRequirement})` : ''}`);
      for (const s of review.suggestions) console.log(`* ${s.target.entity}${s.target.id ? `#${s.target.id.slice(0, 8)}` : ''}.${s.target.field} → ${s.proposedValue.slice(0, 120)}`);
      if (review.terminologyIssues.length) console.log(`! patentna terminologija: ${review.terminologyIssues.map((t) => t.term).join(', ')}`);
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
