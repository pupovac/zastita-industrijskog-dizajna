import { Injectable } from '@nestjs/common';
import { ActorType, Fact } from '@prisma/client';
import { orNotFound } from '../common/not-found';
import { DomainError } from '../domain/domain-error';
import { assertValidNewFact, isConfirmedUserFact, planConfirmation, planContentChange } from '../domain/fact-rules';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { ConfirmFactDto, CreateFactDto, UpdateFactDto } from './facts.dto';

export type FactView = Fact & { confirmedUserFact: boolean };

function view(fact: Fact): FactView {
  return { ...fact, confirmedUserFact: isConfirmedUserFact(fact) };
}

@Injectable()
export class FactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async list(projectId: string): Promise<FactView[]> {
    await this.projects.assertExists(projectId);
    const facts = await this.prisma.fact.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } });
    return facts.map(view);
  }

  async create(projectId: string, dto: CreateFactDto, actor: ActorType): Promise<FactView> {
    await this.projects.assertExists(projectId);
    assertValidNewFact(dto);
    if (dto.sourceType === 'USER' && actor !== 'USER' && !dto.userAnswerId) {
      throw new DomainError(
        'USER_SOURCE_NEEDS_ANSWER',
        'Agent može zabeležiti izjavu korisnika samo uz referencu na njegov odgovor.',
      );
    }
    await this.assertOwnedReferences(projectId, dto);
    const fact = await this.prisma.fact.create({
      data: {
        projectId,
        category: dto.category,
        kind: dto.kind,
        originKind: dto.kind,
        statement: dto.statement,
        value: dto.value,
        sourceType: dto.sourceType,
        sourceReference: dto.sourceReference ?? null,
        sourceDocumentId: dto.sourceDocumentId ?? null,
        uploadedFileId: dto.uploadedFileId ?? null,
        userAnswerId: dto.userAnswerId ?? null,
        confidence: dto.confidence ?? null,
        verified: false,
        createdByActor: actor,
      },
    });
    return view(fact);
  }

  async update(factId: string, dto: UpdateFactDto, actor: ActorType): Promise<FactView> {
    const fact = orNotFound(await this.prisma.fact.findUnique({ where: { id: factId } }), 'Podatak');
    const next = planContentChange(fact, {
      actor,
      statementChanged: dto.statement !== undefined && dto.statement !== fact.statement,
      valueChanged: dto.value !== undefined && dto.value !== fact.value,
    });
    const updated = await this.prisma.fact.update({ where: { id: factId }, data: { ...dto, ...next } });
    return view(updated);
  }

  async confirm(factId: string, dto: ConfirmFactDto, actor: ActorType): Promise<FactView> {
    const fact = orNotFound(await this.prisma.fact.findUnique({ where: { id: factId } }), 'Podatak');
    const next = planConfirmation(fact, {
      actor,
      explicitUserConfirmation: dto.explicitUserConfirmation,
      now: new Date(),
    });
    // Guard against a concurrent edit between read and write: only confirm the version we checked.
    const result = await this.prisma.fact.updateMany({
      where: { id: factId, updatedAt: fact.updatedAt, verified: false },
      data: next,
    });
    if (result.count !== 1) {
      throw new DomainError('FACT_CHANGED', 'Podatak je u međuvremenu izmenjen. Pregledajte ga ponovo.', 'CONFLICT');
    }
    return view(await this.prisma.fact.findUniqueOrThrow({ where: { id: factId } }));
  }

  private async assertOwnedReferences(projectId: string, dto: CreateFactDto) {
    if (dto.uploadedFileId) {
      orNotFound(await this.prisma.uploadedFile.findFirst({ where: { id: dto.uploadedFileId, projectId } }), 'Dokument');
    }
    if (dto.userAnswerId) {
      orNotFound(await this.prisma.userAnswer.findFirst({ where: { id: dto.userAnswerId, projectId } }), 'Odgovor');
    }
    if (dto.sourceDocumentId) {
      orNotFound(
        await this.prisma.sourceDocument.findFirst({ where: { id: dto.sourceDocumentId, source: { projectId } } }),
        'Izvorni dokument',
      );
    }
  }
}
