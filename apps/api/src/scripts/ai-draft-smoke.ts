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
 * One real description draft against the DEMO project (ANTHROPIC_API_KEY from apps/api/.env),
 * or against the project named in AI_DRAFT_SMOKE_PROJECT. Prints the pre-run estimate, then
 * per section: duration, tokens, cache hits, cost and words, so the numbers can be reported.
 * The written versions stay in the project's history.
 */
async function main() {
  const [modeArg, pagesArg] = process.argv.slice(2);
  const mode: AiDraftMode = modeArg === 'EXPAND' ? 'EXPAND' : 'GENERATE';
  const targetPages = pagesArg ? Number(pagesArg) : undefined;
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const prisma = app.get(PrismaService);
    const name = process.env.AI_DRAFT_SMOKE_PROJECT?.trim();
    const project = name ? await prisma.project.findFirst({ where: { name } }) : await prisma.project.findFirst({ where: { isDemo: true, name: DEMO_PROJECT_NAME } });
    if (!project) throw new Error(name ? `Projekat „${name}" ne postoji.` : 'Demo projekat ne postoji. Pokrenite prvo: npm run db:seed:demo');
    const drafts = app.get(AiDraftService);
    const estimate = await drafts.estimate(project.id, { mode, targetPages });
    console.log(
      `procena: ${estimate.calls} poziva · ${Math.round(estimate.durationSeconds.min / 60)}–${Math.round(estimate.durationSeconds.max / 60)} min · ~${estimate.inputTokensPerCall} ulaznih tokena/poziv · ~${estimate.outputTokens} izlaznih · ` +
        `${estimate.estimatedCostUsd === null ? 'cena nepoznata' : `~$${estimate.estimatedCostUsd.toFixed(2)}`} · ${estimate.imageCount} slika · effort ${estimate.effort}`,
    );
    for (const w of estimate.warnings) console.log(`upozorenje: ${w}`);
    const queued = await drafts.start(project.id, { mode, targetPages, replaceConfirmed: false }, 'USER');
    console.log(`pokrenuto: ${queued.id} (${queued.status})`);
    const draft = await drafts.awaitJob(queued.id);
    console.log(`\n=== ${draft.mode} · ${draft.status} · ${draft.model} · effort ${draft.effort} · ${(draft.durationMs / 1000).toFixed(1)}s · cilj ${draft.targetPages} str. · ${draft.imageCount} slika`);
    console.log(
      `tokens: input=${draft.inputTokens} output=${draft.outputTokens} cache_read=${draft.cacheReadTokens} cache_write=${draft.cacheCreationTokens}` +
        ` · est. cost: ${draft.estimatedCostUsd === null ? 'nepoznato' : `$${draft.estimatedCostUsd.toFixed(4)}`}`,
    );
    if (draft.errorMessage) console.log(`error: ${draft.errorMessage}`);
    console.log(`ukupno: ${draft.totals.words} reči ≈ ${draft.totals.pages} str. · markera [POTREBNA DOPUNA]: ${draft.totals.placeholders}`);
    for (const s of draft.sections) {
      console.log(
        `- ${s.key} [${s.generation}] (${s.status}${s.draftVersionNumber ? `, v${s.draftVersionNumber}` : ''}): ${(s.durationMs / 1000).toFixed(1)}s · ` +
          `in=${s.inputTokens} out=${s.outputTokens} cache_read=${s.cacheReadTokens} cache_write=${s.cacheCreationTokens} · ${s.estimatedCostUsd === null ? '' : `$${s.estimatedCostUsd.toFixed(4)} · `}` +
          `${s.wordCount}/${s.targetWords} reči ≈ ${s.pages} str., markera ${s.placeholders}${s.errorMessage ? ` · ! ${s.errorMessage}` : ''}${s.terminologyIssues.length ? ` · ! terminologija: ${s.terminologyIssues.map((t) => t.term).join(', ')}` : ''}`,
      );
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
