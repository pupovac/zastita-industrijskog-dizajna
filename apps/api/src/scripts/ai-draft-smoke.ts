import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AiDraftMode } from '@prisma/client';
import { AiDraftService } from '../ai/ai-draft.service';
import { AppModule } from '../app.module';
import { DEMO_PROJECT_NAME } from '../domain/mock-data';
import { PrismaService } from '../prisma/prisma.service';

/**
 * npm run ai:draft-smoke [-- GENERATE|EXPAND [<targetPages>]]
 *
 * One real description draft against the DEMO project (ANTHROPIC_API_KEY from apps/api/.env).
 * Prints words, pages, placeholders, tokens, cache hits, duration and the estimated cost,
 * so the numbers can be reported. The written versions stay in the demo project's history.
 */
async function main() {
  const [modeArg, pagesArg] = process.argv.slice(2);
  const mode: AiDraftMode = modeArg === 'EXPAND' ? 'EXPAND' : 'GENERATE';
  const targetPages = pagesArg ? Number(pagesArg) : undefined;
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const prisma = app.get(PrismaService);
    const demo = await prisma.project.findFirst({ where: { isDemo: true, name: DEMO_PROJECT_NAME } });
    if (!demo) throw new Error('Demo projekat ne postoji. Pokrenite prvo: npm run db:seed:demo');
    const drafts = app.get(AiDraftService);
    const draft = await drafts.generate(demo.id, { mode, targetPages, replaceConfirmed: false }, 'USER');
    console.log(`\n=== ${draft.mode} · ${draft.status} · ${draft.model} · ${(draft.durationMs / 1000).toFixed(1)}s · cilj ${draft.targetPages} str. · ${draft.imageCount} slika`);
    console.log(
      `tokens: input=${draft.inputTokens} output=${draft.outputTokens} cache_read=${draft.cacheReadTokens} cache_write=${draft.cacheCreationTokens}` +
        ` · est. cost: ${draft.estimatedCostUsd === null ? 'nepoznato' : `$${draft.estimatedCostUsd.toFixed(4)}`}`,
    );
    if (draft.errorMessage) console.log(`error: ${draft.errorMessage}`);
    console.log(`ukupno: ${draft.totals.words} reči ≈ ${draft.totals.pages} str. · markera [POTREBNA DOPUNA]: ${draft.totals.placeholders}`);
    for (const s of draft.sections) {
      console.log(`- ${s.key} (${s.status}${s.draftVersionNumber ? `, v${s.draftVersionNumber}` : ''}): ${s.wordCount} reči ≈ ${s.pages} str., markera ${s.placeholders}${s.terminologyIssues.length ? ` · ! terminologija: ${s.terminologyIssues.map((t) => t.term).join(', ')}` : ''}`);
    }
    for (const n of draft.notes) console.log(`note: ${n}`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
