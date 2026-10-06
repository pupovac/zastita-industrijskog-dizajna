import { Injectable } from '@nestjs/common';
import { ActorType, GeneratedDocument, GeneratedDocumentType, SignoffRole } from '@prisma/client';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { orNotFound } from '../common/not-found';
import { D1_FIELDS } from '../domain/d1-fields';
import { DomainError } from '../domain/domain-error';
import { planPackageGeneration } from '../domain/package-gate';
import { uploadRoot } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { renderMarkdown } from './doc-model';
import { BuildContext, buildCombinedPackage, TEXT_DOCUMENTS } from './package-content';
import { checklistOf, loadPackageSnapshot, openBlockers, PackageSnapshot, terminologyOf } from './package-snapshot';
import { renderDocx } from './render-docx';
import { renderPdf } from './render-pdf';

export const DOCUMENT_TYPE_ORDER: GeneratedDocumentType[] = [
  'DESCRIPTION',
  'PACKAGE_DOCX',
  'PACKAGE_PDF',
  'D1_DATA',
  'REPRESENTATION_INDEX',
  'FILING_CHECKLIST',
  'ATTACHMENT_LIST',
  'SOURCES_REPORT',
  'OPEN_LEGAL_QUESTIONS',
];

function gateInput(s: PackageSnapshot) {
  return {
    openBlockers: openBlockers(s),
    terminology: terminologyOf(s),
    checklist: checklistOf(s),
    unconfirmedSections: s.sections.filter((sec) => sec.required && (!sec.confirmed || !sec.latest?.content.trim())).map((sec) => sec.title),
    missingD1Fields: D1_FIELDS.filter((f) => !s.d1.find((v) => v.fieldKey === f.key)?.value.trim()).map((f) => f.number),
  };
}

/**
 * Final application package (step 13): the 16-point checklist, the generation gate and
 * the nine generated documents with their version history. The system never files anything.
 */
@Injectable()
export class PackageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async status(projectId: string) {
    await this.projects.assertExists(projectId);
    const snapshot = await loadPackageSnapshot(this.prisma, projectId);
    const input = gateInput(snapshot);
    let gate: { canGenerate: boolean; blockedCode: string | null; blockedReason: string | null; isFinal: boolean; missing: string[] };
    try {
      const result = planPackageGeneration(input);
      gate = { canGenerate: true, blockedCode: null, blockedReason: null, ...result };
    } catch (e) {
      if (!(e instanceof DomainError)) throw e;
      gate = { canGenerate: false, blockedCode: e.code, blockedReason: e.message, isFinal: false, missing: [] };
    }
    const documents = await this.prisma.generatedDocument.findMany({
      where: { projectId },
      orderBy: [{ versionNumber: 'desc' }],
    });
    return {
      checklist: input.checklist,
      openBlockers: input.openBlockers,
      terminology: input.terminology.filter((t) => t.matches.length > 0),
      gate,
      latestVersion: documents[0]?.versionNumber ?? null,
      documents: DOCUMENT_TYPE_ORDER.map((type) => ({ type, versions: documents.filter((d) => d.type === type) })),
    };
  }

  async generate(projectId: string, actor: ActorType) {
    await this.projects.assertExists(projectId);
    const snapshot = await loadPackageSnapshot(this.prisma, projectId);
    const gate = planPackageGeneration(gateInput(snapshot));
    const last = await this.prisma.generatedDocument.findFirst({ where: { projectId }, orderBy: { versionNumber: 'desc' } });
    const version = (last?.versionNumber ?? 0) + 1;
    const ctx: BuildContext = {
      snapshot,
      checklist: checklistOf(snapshot),
      version,
      isFinal: gate.isFinal,
      missing: gate.missing,
      generatedAt: new Date(),
    };
    const demo = snapshot.project.isDemo;
    const prefix = demo ? 'DEMO-' : '';
    const files: { type: GeneratedDocumentType; fileName: string; mimeType: string; content: Buffer }[] = TEXT_DOCUMENTS.map(
      (doc) => ({
        type: doc.type,
        fileName: `${prefix}${doc.fileName}-v${version}.md`,
        mimeType: 'text/markdown; charset=utf-8',
        content: Buffer.from(renderMarkdown(doc.build(ctx)), 'utf8'),
      }),
    );
    const combined = buildCombinedPackage(ctx);
    files.push(
      {
        type: 'PACKAGE_DOCX',
        fileName: `${prefix}paket-prijave-v${version}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        content: await renderDocx(combined, { demo }),
      },
      {
        type: 'PACKAGE_PDF',
        fileName: `${prefix}paket-prijave-pregled-v${version}.pdf`,
        mimeType: 'application/pdf',
        content: await renderPdf(combined, { demo }),
      },
    );

    const dir = join('generated', projectId, `v${version}`);
    await mkdir(join(uploadRoot(), dir), { recursive: true });
    for (const file of files) {
      await writeFile(join(uploadRoot(), dir, file.fileName), file.content, { flag: 'wx' });
    }
    await this.prisma.$transaction(
      files.map((file) =>
        this.prisma.generatedDocument.create({
          data: {
            projectId,
            type: file.type,
            versionNumber: version,
            fileName: file.fileName,
            storedPath: join(dir, file.fileName),
            mimeType: file.mimeType,
            sizeBytes: file.content.length,
            sha256: createHash('sha256').update(file.content).digest('hex'),
            isFinal: gate.isFinal,
            isDemo: demo,
            missingJson: JSON.stringify(gate.missing),
            createdByActor: actor,
          },
        }),
      ),
    );
    return this.status(projectId);
  }

  async document(documentId: string): Promise<GeneratedDocument & { absolutePath: string }> {
    const doc = orNotFound(await this.prisma.generatedDocument.findUnique({ where: { id: documentId } }), 'Dokument paketa');
    return { ...doc, absolutePath: join(uploadRoot(), doc.storedPath) };
  }

  async signoffs(projectId: string) {
    await this.projects.assertExists(projectId);
    return this.prisma.finalSignoff.findMany({ where: { projectId }, orderBy: { confirmedAt: 'desc' } });
  }

  /** Step 14: the applicant or representative records that they reviewed the package. Nothing is filed. */
  async signoff(projectId: string, dto: { reviewerName: string; role: SignoffRole; note: string }, actor: ActorType) {
    if (actor !== 'USER') {
      throw new DomainError('SIGNOFF_REQUIRES_USER', 'Završni pregled potvrđuje podnosilac ili zastupnik.', 'FORBIDDEN');
    }
    await this.projects.assertExists(projectId);
    const latest = await this.prisma.generatedDocument.findFirst({ where: { projectId }, orderBy: { versionNumber: 'desc' } });
    if (!latest) {
      throw new DomainError('PACKAGE_NOT_GENERATED', 'Paket prijave još nije generisan.', 'CONFLICT');
    }
    return this.prisma.finalSignoff.create({ data: { ...dto, projectId, packageVersion: latest.versionNumber } });
  }
}
