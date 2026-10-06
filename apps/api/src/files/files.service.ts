import { Injectable } from '@nestjs/common';
import { ActorType, UploadedFile } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { orNotFound } from '../common/not-found';
import { assertValidConflict, planConflictResolution } from '../domain/conflict-rules';
import { DomainError } from '../domain/domain-error';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { extractContent } from './extraction';
import { ACCEPTED_EXTENSIONS, CANONICAL_MIME, detectFileKind } from './file-types';
import { CreateConflictDto, ResolveConflictDto, UpdateFileDto, UploadFileDto } from './files.dto';

export interface IncomingFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}

export function uploadRoot(): string {
  return resolve(process.env.UPLOAD_DIR ?? './storage/uploads');
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  /** Current files; replaced originals stay stored and are listed only on request. */
  async list(projectId: string, includeReplaced = false) {
    await this.projects.assertExists(projectId);
    return this.prisma.uploadedFile.findMany({
      where: { projectId, ...(includeReplaced ? {} : { replacedById: null }) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(fileId: string): Promise<UploadedFile> {
    return orNotFound(await this.prisma.uploadedFile.findUnique({ where: { id: fileId } }), 'Dokument');
  }

  absolutePath(file: UploadedFile): string {
    return join(uploadRoot(), file.storedPath);
  }

  async upload(projectId: string, file: IncomingFile | undefined, dto: UploadFileDto, actor: ActorType) {
    await this.projects.assertExists(projectId);
    return this.store(projectId, file, dto, actor);
  }

  /**
   * Replaces a file with a new version. The original stays stored (marked as replaced);
   * representations and interview answers that used it now point to the new version.
   * Facts keep pointing to the document they were extracted from.
   */
  async replace(fileId: string, file: IncomingFile | undefined, actor: ActorType) {
    if (actor !== 'USER') {
      throw new DomainError('REPLACE_REQUIRES_USER', 'Dokument može da zameni samo korisnik.', 'FORBIDDEN');
    }
    const old = await this.get(fileId);
    if (old.replacedById) {
      throw new DomainError('FILE_ALREADY_REPLACED', 'Ovaj dokument je već zamenjen novijom verzijom.', 'CONFLICT');
    }
    const next = await this.store(old.projectId, file, { role: old.role }, actor);
    await this.prisma.$transaction([
      this.prisma.uploadedFile.update({ where: { id: old.id }, data: { replacedById: next.id } }),
      this.prisma.representation.updateMany({ where: { uploadedFileId: old.id }, data: { uploadedFileId: next.id } }),
      this.prisma.userAnswer.updateMany({ where: { attachmentFileId: old.id }, data: { attachmentFileId: next.id } }),
      this.prisma.priorDesign.updateMany({ where: { imageFileId: old.id }, data: { imageFileId: next.id } }),
    ]);
    return next;
  }

  /** Deletes a document and its stored original. Only the user can do it. */
  async remove(fileId: string, actor: ActorType) {
    if (actor !== 'USER') {
      throw new DomainError('DELETE_REQUIRES_USER', 'Dokument može da obriše samo korisnik.', 'FORBIDDEN');
    }
    const file = await this.get(fileId);
    await this.prisma.uploadedFile.delete({ where: { id: file.id } });
    await rm(this.absolutePath(file), { force: true });
    return { id: file.id, deleted: true };
  }

  private async store(projectId: string, file: IncomingFile | undefined, dto: UploadFileDto, actor: ActorType) {
    if (!file || file.size === 0) {
      throw new DomainError('FILE_REQUIRED', 'Izaberite dokument za otpremanje.');
    }
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const kind = detectFileKind(originalName, file.buffer);
    if (!kind) {
      throw new DomainError(
        'UNSUPPORTED_FILE_TYPE',
        `Format nije podržan ili sadržaj ne odgovara ekstenziji. Podržani formati: ${ACCEPTED_EXTENSIONS.join(', ')}.`,
      );
    }

    // 1. Persist the original byte-for-byte before anything else.
    const id = randomUUID();
    const extension = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
    const storedPath = join(projectId, `${id}${extension}`);
    await mkdir(join(uploadRoot(), projectId), { recursive: true });
    await writeFile(join(uploadRoot(), storedPath), file.buffer, { flag: 'wx' });

    const record = await this.prisma.uploadedFile.create({
      data: {
        id,
        projectId,
        originalName,
        storedPath,
        mimeType: CANONICAL_MIME[kind],
        sizeBytes: file.size,
        sha256: createHash('sha256').update(file.buffer).digest('hex'),
        role: dto.role,
        extractionStatus: 'PENDING',
        uploadedByActor: actor,
      },
    });

    // 2. Extract text and metadata. Failure leaves the original intact and flags manual review.
    const extraction = await extractContent(kind, file.buffer);
    return this.prisma.uploadedFile.update({
      where: { id: record.id },
      data: {
        extractionStatus: extraction.status,
        extractedText: extraction.text,
        metadataJson: JSON.stringify(extraction.metadata),
        summary: extraction.summary,
        extractionError: extraction.error,
      },
    });
  }

  async update(fileId: string, dto: UpdateFileDto) {
    await this.get(fileId);
    return this.prisma.uploadedFile.update({ where: { id: fileId }, data: dto });
  }

  /** Flags a discrepancy between two materials. It is handed to the user to decide. */
  async createConflict(projectId: string, dto: CreateConflictDto, actor: ActorType) {
    await this.projects.assertExists(projectId);
    const [a, b] = await Promise.all([this.get(dto.fileAId), this.get(dto.fileBId)]);
    assertValidConflict(projectId, a, b, dto.attribute);
    return this.prisma.reviewIssue.create({
      data: {
        projectId,
        stepKey: 'DOCUMENT_UPLOAD',
        type: 'CONFLICT',
        severity: 'HIGH',
        title: `Neslaganje: ${dto.attribute}`,
        description: dto.description,
        conflictAttribute: dto.attribute,
        fileAId: a.id,
        fileBId: b.id,
        createdByActor: actor,
      },
      include: { fileA: true, fileB: true, chosenFile: true },
    });
  }

  async resolveConflict(issueId: string, dto: ResolveConflictDto, actor: ActorType) {
    const issue = orNotFound(await this.prisma.reviewIssue.findUnique({ where: { id: issueId } }), 'Konflikt');
    const resolution = planConflictResolution(issue, {
      actor,
      chosenFileId: dto.chosenFileId,
      note: dto.note,
      now: new Date(),
    });
    const chosen = await this.get(resolution.chosenFileId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.reviewIssue.updateMany({ where: { id: issueId, status: 'OPEN' }, data: resolution });
      if (updated.count !== 1) {
        throw new DomainError('CONFLICT_NOT_OPEN', 'Konflikt je već zatvoren.', 'CONFLICT');
      }
      // The choice is recorded as a user decision. Facts are not changed automatically.
      await tx.decision.create({
        data: {
          projectId: issue.projectId,
          stepKey: issue.stepKey,
          title: `${issue.conflictAttribute ?? 'Konflikt'}: tačna verzija je „${chosen.originalName}"`,
          rationale: resolution.resolutionNote ?? '',
          decidedBy: 'USER',
          reviewIssueId: issue.id,
        },
      });
      return tx.reviewIssue.findUniqueOrThrow({
        where: { id: issueId },
        include: { fileA: true, fileB: true, chosenFile: true },
      });
    });
  }
}
