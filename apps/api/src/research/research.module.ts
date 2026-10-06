import { Controller, Get, Injectable, Module, Param, ParseIntPipe, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { existsSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { orNotFound } from '../common/not-found';
import { DomainError } from '../domain/domain-error';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { INITIAL_RESEARCH_REPORT, ResearchImportService, researchDocsDir } from './research-import.service';

export interface RequirementFilter {
  area?: string;
  phase?: string;
  status?: string;
  discrepancy?: string;
}

@Injectable()
export class ResearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  /** The "Matrica zahteva ZIS-a" with every cited source; filterable by area, phase and status. */
  async requirements(projectId: string, filter: RequirementFilter) {
    await this.projects.assertExists(projectId);
    const rows = await this.prisma.sourceRequirement.findMany({
      where: {
        projectId,
        ...(filter.area ? { areaCode: filter.area } : {}),
        ...(filter.status ? { status: filter.status === 'CONFIRMED' ? 'CONFIRMED' : 'UNVERIFIED' } : {}),
        ...(filter.discrepancy === 'true' ? { isDiscrepancy: true } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        citations: { orderBy: { position: 'asc' }, include: { sourceDocument: { include: { source: true } } } },
      },
    });
    const phase = filter.phase ? Number(filter.phase) : null;
    return rows
      .map(({ phasesJson, openItemsJson, ...r }) => ({
        ...r,
        phases: JSON.parse(phasesJson) as { number: number; name: string }[],
        openItems: JSON.parse(openItemsJson) as string[],
      }))
      .filter((r) => phase === null || r.phases.some((p) => p.number === phase));
  }

  async report(projectId: string) {
    await this.projects.assertExists(projectId);
    return this.prisma.researchReportSection.findMany({
      where: { projectId, reportKey: INITIAL_RESEARCH_REPORT },
      orderBy: { position: 'asc' },
    });
  }

  /** Absolute path of a local copy of a source, restricted to the repository `docs/` directory. */
  async localCopyPath(sourceId: string, index: number): Promise<string> {
    const source = orNotFound(await this.prisma.source.findUnique({ where: { id: sourceId } }), 'Izvor');
    const copies = JSON.parse(source.localCopiesJson) as string[];
    const relative = copies[index];
    if (!relative) throw new DomainError('LOCAL_COPY_NOT_FOUND', 'Lokalna kopija ne postoji.', 'NOT_FOUND');
    const docs = researchDocsDir();
    const full = resolve(dirname(docs), relative);
    if (!full.startsWith(docs + sep) || !existsSync(full)) {
      throw new DomainError('LOCAL_COPY_NOT_FOUND', 'Lokalna kopija nije dostupna.', 'NOT_FOUND');
    }
    return full;
  }
}

@Controller()
export class ResearchController {
  constructor(
    private readonly research: ResearchService,
    private readonly importer: ResearchImportService,
  ) {}

  /** Idempotent import of the phase 1–2 results from `docs/`. */
  @Post('projects/:projectId/research/import')
  import(@Param('projectId') projectId: string) {
    return this.importer.importInto(projectId);
  }

  @Get('projects/:projectId/requirements')
  requirements(
    @Param('projectId') projectId: string,
    @Query('area') area?: string,
    @Query('phase') phase?: string,
    @Query('status') status?: string,
    @Query('discrepancy') discrepancy?: string,
  ) {
    return this.research.requirements(projectId, { area, phase, status, discrepancy });
  }

  @Get('projects/:projectId/research-report')
  report(@Param('projectId') projectId: string) {
    return this.research.report(projectId);
  }

  @Get('sources/:sourceId/local-copies/:index')
  async localCopy(
    @Param('sourceId') sourceId: string,
    @Param('index', ParseIntPipe) index: number,
    @Res() res: Response,
  ) {
    const path = await this.research.localCopyPath(sourceId, index);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (/\.(html?|svg)$/i.test(path)) {
      // Saved web pages are shown as evidence only; never let their scripts run.
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
    }
    res.sendFile(path);
  }
}

@Module({
  controllers: [ResearchController],
  providers: [ResearchService, ResearchImportService],
  exports: [ResearchImportService],
})
export class ResearchModule {}
