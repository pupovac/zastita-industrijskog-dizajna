import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DomainError } from '../domain/domain-error';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import {
  classificationToKind,
  classifySource,
  matrixSourceType,
  parseResearchReport,
  parseSourceRecords,
  requirementStatus,
  RequirementsMatrix,
  SourceRecord,
} from './research-docs';

export const INITIAL_RESEARCH_REPORT = 'INITIAL_RESEARCH';

/** Repository `docs/` directory. Overridable with RESEARCH_DOCS_DIR. */
export function researchDocsDir(): string {
  return resolve(process.env.RESEARCH_DOCS_DIR ?? join(__dirname, '..', '..', '..', '..', 'docs'));
}

export interface ResearchImportSummary {
  sources: number;
  sourceDocuments: number;
  findings: number;
  requirements: number;
  citations: number;
  reportSections: number;
}

type Tx = Prisma.TransactionClient;

/**
 * Imports the real results of phases 1 and 2 (source records, local copies, the
 * "Matrica zahteva ZIS-a" and "Rezultati inicijalnog istraživanja") into a project.
 * Idempotent: records are keyed by their codes (Z-xx, MZ-xxx, A.1 …) and updated in place.
 * User confirmations (`verified`) are never touched by a re-import.
 */
@Injectable()
export class ResearchImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async importInto(projectId: string): Promise<ResearchImportSummary> {
    await this.projects.assertExists(projectId);
    const docs = researchDocsDir();
    const read = (path: string) => {
      const full = join(docs, path);
      if (!existsSync(full)) {
        throw new DomainError('RESEARCH_DOCS_MISSING', `Dokument istraživanja nije pronađen: docs/${path}.`, 'NOT_FOUND');
      }
      return readFileSync(full, 'utf8');
    };
    const records = parseSourceRecords(read('izvori/zapisi-izvora.md'));
    const matrix = JSON.parse(read('faza-2/matrica-zahteva-zis.json')) as RequirementsMatrix;
    const report = parseResearchReport(read('faza-2/rezultati-inicijalnog-istrazivanja.md'));

    return this.prisma.$transaction(
      async (tx) => {
        const summary: ResearchImportSummary = {
          sources: 0,
          sourceDocuments: 0,
          findings: 0,
          requirements: 0,
          citations: 0,
          reportSections: 0,
        };
        const documentByCode = new Map<string, string>();

        for (const source of matrix.sources) {
          const record = records.find((r) => r.code === source.id.split('/')[0]);
          const { sourceId, documentId } = await this.upsertSource(tx, projectId, source, record, matrix);
          documentByCode.set(source.id, documentId);
          summary.sources++;
          summary.sourceDocuments++;
          // Findings are imported once per record, on its base code (Z-08 also covers Z-08/CP10).
          if (record && source.id === record.code) {
            summary.findings += await this.upsertFindings(tx, projectId, sourceId, documentId, record);
          }
        }

        for (const [index, req] of matrix.requirements.entries()) {
          const citations = req.sources.filter((s) => documentByCode.has(s.id));
          if (citations.length === 0) {
            throw new DomainError('RESEARCH_SOURCE_UNKNOWN', `Zahtev ${req.id} nema poznat izvor.`);
          }
          const data = {
            sourceDocumentId: documentByCode.get(citations[0].id)!,
            requirementText: req.requirement,
            section: citations[0].location,
            impactOnApplication: req.impact,
            kind: classificationToKind(req.classification),
            sourceType: matrixSourceType(req.source_type),
            sourceReference: req.sources.map((s) => `${s.id} ${s.location}`.trim()).join('; '),
            status: requirementStatus(req.status),
            area: req.area,
            areaCode: req.area_code,
            phasesJson: JSON.stringify(req.phases),
            isDiscrepancy: req.is_discrepancy,
            precedence: req.precedence ?? '',
            openItemsJson: JSON.stringify(req.open_items),
            accessDate: req.access_date,
          };
          const requirement = await tx.sourceRequirement.upsert({
            where: { projectId_code: { projectId, code: req.id } },
            create: { projectId, code: req.id, ...data, createdAt: orderedTimestamp(index) },
            update: data,
          });
          await tx.requirementCitation.deleteMany({ where: { sourceRequirementId: requirement.id } });
          for (const [position, citation] of citations.entries()) {
            await tx.requirementCitation.create({
              data: {
                sourceRequirementId: requirement.id,
                sourceDocumentId: documentByCode.get(citation.id)!,
                location: citation.location,
                position,
              },
            });
            summary.citations++;
          }
          summary.requirements++;
        }

        for (const [position, section] of report.entries()) {
          const data = {
            position,
            heading: section.heading,
            body: section.body,
            sourceReference: `docs/faza-2/rezultati-inicijalnog-istrazivanja.md, ${section.code === 'INTRO' ? 'uvod' : `sekcija ${section.code}`}`,
          };
          await tx.researchReportSection.upsert({
            where: { projectId_reportKey_code: { projectId, reportKey: INITIAL_RESEARCH_REPORT, code: section.code } },
            create: { projectId, reportKey: INITIAL_RESEARCH_REPORT, code: section.code, ...data },
            update: data,
          });
          summary.reportSections++;
        }
        return summary;
      },
      { timeout: 60_000 },
    );
  }

  private async upsertSource(
    tx: Tx,
    projectId: string,
    source: RequirementsMatrix['sources'][number],
    record: SourceRecord | undefined,
    matrix: RequirementsMatrix,
  ) {
    const fields = record?.fields ?? {};
    const institution = fields['institucija'] ?? '';
    const { sourceType, priority } = classifySource(source.url, institution);
    const accessed = fields['datum pristupa'] || matrix.access_date_default;
    // A sub-source (Z-08/CP10) owns the local copies whose file name carries its suffix.
    const suffix = source.id.split('/')[1];
    const siblings = suffix ? [] : matrixSuffixes(matrix, source.id);
    const localCopies = (record?.localCopies ?? []).filter((path) =>
      suffix ? path.includes(suffix) : !siblings.some((s) => path.includes(s)),
    );
    const data = {
      name: source.document,
      url: source.url,
      sourceType,
      priority,
      institution,
      documentKind: fields['vrsta dokumenta'] ?? '',
      documentVersion: fields['datum/verzija dokumenta'] ?? '',
      relevantSections: fields['relevantne sekcije'] ?? fields['relevantne sekcije / izdvojeni zahtevi / značaj'] ?? '',
      significance: fields['značaj za naš projekat'] ?? '',
      localCopiesJson: JSON.stringify(localCopies),
      accessedAt: parseDate(accessed),
    };
    const saved = await tx.source.upsert({
      where: { projectId_code: { projectId, code: source.id } },
      create: { projectId, code: source.id, ...data },
      update: data,
    });
    const documentData = {
      title: source.document,
      url: source.url,
      localCopyPath: localCopies[0] ?? null,
      accessedAt: parseDate(accessed),
      notes: data.relevantSections,
    };
    const existing = await tx.sourceDocument.findFirst({ where: { sourceId: saved.id }, orderBy: { createdAt: 'asc' } });
    const document = existing
      ? await tx.sourceDocument.update({ where: { id: existing.id }, data: documentData })
      : await tx.sourceDocument.create({ data: { sourceId: saved.id, ...documentData } });
    return { sourceId: saved.id, documentId: document.id };
  }

  private async upsertFindings(tx: Tx, projectId: string, sourceId: string, documentId: string, record: SourceRecord) {
    const source = await tx.source.findUniqueOrThrow({ where: { id: sourceId } });
    for (const [i, item] of record.items.entries()) {
      const inference = item.kind === 'AI_INFERENCE' || item.kind === 'RECOMMENDATION';
      const data = {
        sourceDocumentId: documentId,
        summary: item.text,
        kind: item.kind,
        sourceType: inference ? ('AGENT_INFERENCE' as const) : source.sourceType,
        sourceReference: `${record.code} (docs/izvori/zapisi-izvora.md)`,
      };
      await tx.researchFinding.upsert({
        where: { projectId_code: { projectId, code: `${record.code}#${i + 1}` } },
        create: { projectId, code: `${record.code}#${i + 1}`, ...data, createdAt: orderedTimestamp(i) },
        update: data,
      });
    }
    return record.items.length;
  }
}

function matrixSuffixes(matrix: RequirementsMatrix, baseId: string): string[] {
  return matrix.sources.filter((s) => s.id.startsWith(`${baseId}/`)).map((s) => s.id.split('/')[1]);
}

function parseDate(value: string): Date | null {
  const match = /\d{4}-\d{2}-\d{2}/.exec(value);
  return match ? new Date(`${match[0]}T00:00:00Z`) : null;
}

/** Keeps the document order when records are listed by creation time. */
function orderedTimestamp(index: number): Date {
  return new Date(Date.UTC(2026, 9, 6, 0, 0, 0, index));
}
