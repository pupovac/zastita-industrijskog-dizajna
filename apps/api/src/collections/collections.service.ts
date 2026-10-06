import { Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';
import { orNotFound } from '../common/not-found';
import { DomainError } from '../domain/domain-error';
import { assertMockAllowed } from '../domain/mock-data';
import { contentChanged, planRecordConfirmation, planRecordEdit } from '../domain/record-provenance';
import { PrismaService } from '../prisma/prisma.service';
import { CollectionConfig, CrudDelegate } from './collection-config';

type Db = Prisma.TransactionClient;
type Row = Record<string, unknown>;

/**
 * Generic create / list / update / delete / confirm for the project memory entities.
 * Every write enforces the same invariants: records stay inside their project, mock
 * data never enters a real project, `verified` is set only by the user's explicit
 * confirmation, and a confirmed record is locked against agents.
 */
@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private delegate(config: CollectionConfig, db: Db = this.prisma): CrudDelegate {
    return db[config.model] as unknown as CrudDelegate;
  }

  private async project(projectId: string, db: Db = this.prisma) {
    return orNotFound(
      await db.project.findUnique({ where: { id: projectId }, select: { id: true, isDemo: true } }),
      'Projekat',
    );
  }

  private where(config: CollectionConfig, projectId: string): object {
    return config.hasProjectId ? { projectId } : config.projectWhere!(projectId);
  }

  async list(config: CollectionConfig, projectId: string) {
    await this.project(projectId);
    return this.delegate(config).findMany({
      where: this.where(config, projectId),
      orderBy: config.orderBy,
      ...(config.include ? { include: config.include } : {}),
    });
  }

  async create(config: CollectionConfig, projectId: string, dto: Row, actor: ActorType) {
    return this.prisma.$transaction(async (db) => {
      const project = await this.project(projectId, db);
      config.validate?.(dto, null);
      assertMockAllowed(project, dto.sourceReference as string | undefined);
      await this.assertOwnedReferences(config, projectId, dto, db);
      const prepared = config.prepareCreate ? await config.prepareCreate(dto, { actor, projectId, db }) : dto;
      return this.delegate(config, db).create({
        data: { ...prepared, ...(config.hasProjectId ? { projectId } : {}) },
        ...(config.include ? { include: config.include } : {}),
      });
    });
  }

  async update(config: CollectionConfig, id: string, dto: Row, actor: ActorType) {
    return this.prisma.$transaction(async (db) => {
      const stored = await this.find(config, id, db);
      const projectId = await this.projectIdOf(config, stored, db);
      const project = await this.project(projectId, db);
      config.validate?.(dto, stored);
      assertMockAllowed(project, (dto.sourceReference ?? stored.sourceReference) as string | undefined);
      await this.assertOwnedReferences(config, projectId, dto, db);
      const edit = config.provenance
        ? planRecordEdit(
            { verified: Boolean(stored.verified), kind: stored.kind as never },
            actor,
            contentChanged(stored, dto, config.contentFields),
          )
        : {};
      return this.delegate(config, db).update({
        where: { id },
        data: { ...dto, ...edit },
        ...(config.include ? { include: config.include } : {}),
      });
    });
  }

  async remove(config: CollectionConfig, id: string, actor: ActorType) {
    if (!config.deletable) {
      throw new DomainError('DELETE_NOT_ALLOWED', `${config.label} se ne može obrisati.`, 'CONFLICT');
    }
    const stored = await this.find(config, id);
    if (config.provenance && stored.verified && actor !== 'USER') {
      throw new DomainError(
        'CONFIRMED_VALUE_LOCKED',
        'Potvrđeni podatak može da obriše samo korisnik.',
        'FORBIDDEN',
      );
    }
    await this.delegate(config).delete({ where: { id } });
    return { id, deleted: true };
  }

  /** POTVRDI. A recommendation is adopted and recorded as the user's decision. */
  async confirm(config: CollectionConfig, id: string, explicitUserConfirmation: boolean, actor: ActorType) {
    if (!config.provenance) {
      throw new DomainError('CONFIRMATION_NOT_SUPPORTED', `${config.label} se ne potvrđuje.`, 'CONFLICT');
    }
    return this.prisma.$transaction(async (db) => {
      const stored = await this.find(config, id, db);
      const projectId = await this.projectIdOf(config, stored, db);
      const plan = planRecordConfirmation(
        { verified: Boolean(stored.verified), kind: stored.kind as never },
        { actor, explicitUserConfirmation },
      );
      const { recordAsDecision, ...data } = plan;
      // Only confirm the version the user saw: a concurrent edit makes the confirmation fail.
      const result = await this.delegate(config, db).updateMany({
        where: { id, verified: false, ...('updatedAt' in stored ? { updatedAt: stored.updatedAt } : {}) },
        data,
      });
      if (result.count !== 1) {
        throw new DomainError('RECORD_CHANGED', 'Podatak je u međuvremenu izmenjen. Pregledajte ga ponovo.', 'CONFLICT');
      }
      if (recordAsDecision) {
        await db.decision.create({
          data: {
            projectId,
            stepKey: config.stepKey,
            title: config.decisionTitle?.(stored) ?? `Usvojena preporuka (${config.label})`,
            rationale: String(stored.rationale ?? ''),
            decidedBy: 'USER',
            sourceType: 'USER',
            sourceReference: `${config.path}/${id}`,
          },
        });
      }
      return this.delegate(config, db).findUnique({
        where: { id },
        ...(config.include ? { include: config.include } : {}),
      });
    });
  }

  private async find(config: CollectionConfig, id: string, db: Db = this.prisma): Promise<Row> {
    return orNotFound(await this.delegate(config, db).findUnique({ where: { id } }), config.label);
  }

  private async projectIdOf(config: CollectionConfig, record: Row, db: Db): Promise<string> {
    return config.projectIdOf ? config.projectIdOf(record, db) : String(record.projectId);
  }

  private async assertOwnedReferences(config: CollectionConfig, projectId: string, dto: Row, db: Db) {
    for (const ref of config.references) {
      const value = dto[ref.field];
      if (typeof value !== 'string') continue;
      const where =
        ref.model === 'sourceDocument' ? { id: value, source: { projectId } } : { id: value, projectId };
      const delegate = db[ref.model] as unknown as CrudDelegate;
      orNotFound(await delegate.findFirst({ where }), ref.label);
    }
  }
}
