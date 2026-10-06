import { Injectable } from '@nestjs/common';
import { ActorType, DraftVersion, Prisma } from '@prisma/client';
import { orNotFound } from '../common/not-found';
import { DEFAULT_APPLICATION_SECTIONS } from '../domain/application-sections';
import { DomainError } from '../domain/domain-error';
import { assertMockAllowed } from '../domain/mock-data';
import { findPatentTerms } from '../domain/patent-terms';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateSectionDto, DraftContentDto, UpdateSectionDto } from './drafting.dto';

type Db = Prisma.TransactionClient;

function withTerminology(version: DraftVersion) {
  return { ...version, terminologyIssues: findPatentTerms(version.content) };
}

/**
 * Description sections (step 10) with full version history. Every version is kept;
 * a new version always drops the user's confirmation of the section.
 */
@Injectable()
export class DraftingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  /** Lists sections (creating the default ones on first access) with all versions, newest first. */
  async list(projectId: string) {
    await this.projects.assertExists(projectId);
    await this.ensureDefaultSections(projectId);
    const sections = await this.prisma.applicationSection.findMany({
      where: { projectId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });
    return sections.map(({ versions, ...s }) => ({ ...s, versions: versions.map(withTerminology) }));
  }

  async ensureDefaultSections(projectId: string, db: Db = this.prisma) {
    for (const [i, section] of DEFAULT_APPLICATION_SECTIONS.entries()) {
      await db.applicationSection.upsert({
        where: { projectId_key: { projectId, key: section.key } },
        create: { projectId, key: section.key, title: section.title, position: i + 1, required: true },
        update: {},
      });
    }
  }

  async createSection(projectId: string, dto: CreateSectionDto) {
    await this.projects.assertExists(projectId);
    const exists = await this.prisma.applicationSection.findUnique({ where: { projectId_key: { projectId, key: dto.key } } });
    if (exists) throw new DomainError('SECTION_EXISTS', 'Sekcija sa tim ključem već postoji.', 'CONFLICT');
    const last = await this.prisma.applicationSection.findFirst({ where: { projectId }, orderBy: { position: 'desc' } });
    return this.prisma.applicationSection.create({ data: { ...dto, projectId, position: (last?.position ?? 0) + 1 } });
  }

  async updateSection(sectionId: string, dto: UpdateSectionDto) {
    await this.section(sectionId);
    return this.prisma.applicationSection.update({ where: { id: sectionId }, data: dto });
  }

  async versions(sectionId: string) {
    await this.section(sectionId);
    const versions = await this.prisma.draftVersion.findMany({
      where: { applicationSectionId: sectionId },
      orderBy: { versionNumber: 'desc' },
    });
    return versions.map(withTerminology);
  }

  /** Always creates a new version. */
  async addVersion(sectionId: string, dto: DraftContentDto, actor: ActorType) {
    return this.prisma.$transaction(async (db) => this.createVersion(db, sectionId, dto, actor));
  }

  /**
   * Autosave. Updates the actor's own latest version while it is the newest and not
   * confirmed; otherwise starts a new version, so nobody overwrites someone else's text.
   */
  async saveWorkingDraft(sectionId: string, dto: DraftContentDto, actor: ActorType) {
    return this.prisma.$transaction(async (db) => {
      const section = await this.section(sectionId, db);
      const latest = await db.draftVersion.findFirst({
        where: { applicationSectionId: sectionId },
        orderBy: { versionNumber: 'desc' },
      });
      if (!latest || latest.createdByActor !== actor || latest.verified || section.confirmed) {
        return this.createVersion(db, sectionId, dto, actor);
      }
      if (latest.content === dto.content) return withTerminology(latest);
      const updated = await db.draftVersion.update({ where: { id: latest.id }, data: { content: dto.content } });
      return withTerminology(updated);
    });
  }

  /** POTVRDI for a section: the user accepts its latest version. */
  async confirm(sectionId: string, explicitUserConfirmation: boolean, actor: ActorType) {
    if (actor !== 'USER') {
      throw new DomainError('CONFIRMATION_REQUIRES_USER', 'Samo korisnik može da potvrdi tekst.', 'FORBIDDEN');
    }
    if (explicitUserConfirmation !== true) {
      throw new DomainError('CONFIRMATION_NOT_EXPLICIT', 'Potvrda mora biti eksplicitna.');
    }
    return this.prisma.$transaction(async (db) => {
      const section = await this.section(sectionId, db);
      const latest = await db.draftVersion.findFirst({
        where: { applicationSectionId: sectionId },
        orderBy: { versionNumber: 'desc' },
      });
      if (!latest?.content.trim()) {
        throw new DomainError('SECTION_EMPTY', 'Sekcija nema tekst koji bi se mogao potvrditi.', 'CONFLICT');
      }
      if (section.confirmed) throw new DomainError('ALREADY_CONFIRMED', 'Sekcija je već potvrđena.', 'CONFLICT');
      await db.draftVersion.update({ where: { id: latest.id }, data: { verified: true } });
      return db.applicationSection.update({ where: { id: sectionId }, data: { confirmed: true, verified: true } });
    });
  }

  private async createVersion(db: Db, sectionId: string, dto: DraftContentDto, actor: ActorType) {
    const section = await this.section(sectionId, db);
    const project = await db.project.findUniqueOrThrow({ where: { id: section.projectId } });
    assertMockAllowed(project, dto.sourceReference);
    const latest = await db.draftVersion.findFirst({
      where: { applicationSectionId: sectionId },
      orderBy: { versionNumber: 'desc' },
    });
    const version = await db.draftVersion.create({
      data: {
        applicationSectionId: sectionId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        content: dto.content,
        createdByActor: actor,
        sourceType: dto.sourceType ?? (actor === 'USER' ? 'USER' : 'AGENT_INFERENCE'),
        sourceReference: dto.sourceReference ?? null,
        confidence: dto.confidence ?? null,
      },
    });
    await db.applicationSection.update({ where: { id: sectionId }, data: { confirmed: false, verified: false } });
    return withTerminology(version);
  }

  private async section(sectionId: string, db: Db = this.prisma) {
    return orNotFound(await db.applicationSection.findUnique({ where: { id: sectionId } }), 'Sekcija opisa');
  }
}
