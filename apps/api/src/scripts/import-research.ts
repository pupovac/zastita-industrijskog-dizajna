import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { ResearchImportService } from '../research/research-import.service';

/**
 * npm run db:import:research [-- --project <id> ...]
 * Imports the phase 1–2 results from docs/ into the given projects (default: all projects).
 * Safe to run repeatedly: records are updated in place, user confirmations are kept.
 */
async function main() {
  const args = process.argv.slice(2);
  const requested = args.flatMap((arg, i) => (arg === '--project' && args[i + 1] ? [args[i + 1]] : []));
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const prisma = app.get(PrismaService);
    const projects = await prisma.project.findMany({
      where: requested.length ? { id: { in: requested } } : {},
      select: { id: true, name: true },
    });
    if (projects.length === 0) console.log('Nema projekata za uvoz.');
    for (const project of projects) {
      const summary = await app.get(ResearchImportService).importInto(project.id);
      console.log(`${project.name} (${project.id}): ${JSON.stringify(summary)}`);
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
