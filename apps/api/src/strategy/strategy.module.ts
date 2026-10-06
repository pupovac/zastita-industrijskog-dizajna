import { Body, Controller, Get, Injectable, Module, Param, Post, Put } from '@nestjs/common';
import { ActorType, InformationKind, SourceType, StrategyItemKey } from '@prisma/client';
import { z } from 'zod';
import { Actor } from '../common/actor.decorator';
import { orNotFound } from '../common/not-found';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DomainError } from '../domain/domain-error';
import { assertValidNewFact } from '../domain/fact-rules';
import { assertMockAllowed } from '../domain/mock-data';
import { contentChanged, planRecordConfirmation, planRecordEdit } from '../domain/record-provenance';
import { assertValidStrategyValue, parseRequirementRefs, STRATEGY_ITEMS } from '../domain/strategy';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';

const saveItemSchema = z
  .object({
    value: z.string().trim().max(200),
    details: z.string().trim().max(10000),
    rationale: z.string().trim().max(10000),
    /** Matrix codes, e.g. "MZ-120, MZ-123". */
    requirementRefs: z.string().trim().max(1000),
    kind: z.nativeEnum(InformationKind),
    sourceType: z.nativeEnum(SourceType),
    sourceReference: z.string().trim().max(2000).nullable(),
    confidence: z.number().min(0).max(1).nullable(),
  })
  .partial()
  .strict();
type SaveItemDto = z.infer<typeof saveItemSchema>;
const confirmSchema = z.object({ explicitUserConfirmation: z.literal(true) }).strict();
const itemKey = z.nativeEnum(StrategyItemKey);

/**
 * Protection strategy (step 8): single / separate / multiple application, variants,
 * deferred publication and priority — each with rationale and matrix references.
 * Agents propose (RECOMMENDATION); the user adopts, which is recorded as a decision.
 */
@Injectable()
export class StrategyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async get(projectId: string) {
    await this.projects.assertExists(projectId);
    const stored = await this.prisma.protectionStrategyItem.findMany({ where: { projectId } });
    const codes = [...new Set(stored.flatMap((i) => parseRequirementRefs(i.requirementRefs)))];
    const requirements = codes.length
      ? await this.prisma.sourceRequirement.findMany({
          where: { projectId, code: { in: codes } },
          include: { citations: { include: { sourceDocument: { include: { source: true } } } } },
        })
      : [];
    return STRATEGY_ITEMS.map((def) => {
      const item = stored.find((i) => i.key === def.key) ?? null;
      const refs = item ? parseRequirementRefs(item.requirementRefs) : [];
      return {
        key: def.key,
        title: def.title,
        allowedValues: def.values,
        item,
        requirements: requirements.filter((r) => r.code && refs.includes(r.code)),
        unknownRequirementRefs: refs.filter((code) => !requirements.some((r) => r.code === code)),
      };
    });
  }

  async save(projectId: string, key: StrategyItemKey, dto: SaveItemDto, actor: ActorType) {
    const project = await this.projects.get(projectId);
    assertMockAllowed(project, dto.sourceReference);
    if (dto.value !== undefined) assertValidStrategyValue(key, dto.value);
    if (dto.requirementRefs !== undefined) parseRequirementRefs(dto.requirementRefs);
    const stored = await this.prisma.protectionStrategyItem.findUnique({ where: { projectId_key: { projectId, key } } });
    const kind = dto.kind ?? stored?.kind ?? 'RECOMMENDATION';
    const sourceType = dto.sourceType ?? stored?.sourceType ?? (actor === 'USER' ? 'USER' : 'AGENT_INFERENCE');
    if (!(stored?.verified && kind === 'FACT')) {
      assertValidNewFact({ kind, sourceType, sourceReference: dto.sourceReference ?? stored?.sourceReference });
    }
    if (!stored) {
      return this.prisma.protectionStrategyItem.create({ data: { ...dto, kind, sourceType, projectId, key } });
    }
    const edit = planRecordEdit(stored, actor, contentChanged(stored, dto, ['value', 'details', 'rationale']));
    return this.prisma.protectionStrategyItem.update({ where: { id: stored.id }, data: { ...dto, ...edit } });
  }

  async confirm(projectId: string, key: StrategyItemKey, actor: ActorType, explicitUserConfirmation: boolean) {
    const item = orNotFound(
      await this.prisma.protectionStrategyItem.findUnique({ where: { projectId_key: { projectId, key } } }),
      'Stavka strategije',
    );
    if (!item.value.trim() && !item.details.trim()) {
      throw new DomainError('STRATEGY_ITEM_EMPTY', 'Stavka strategije još nema vrednost.', 'CONFLICT');
    }
    const plan = planRecordConfirmation(item, { actor, explicitUserConfirmation });
    const title = STRATEGY_ITEMS.find((i) => i.key === key)!.title;
    return this.prisma.$transaction(async (db) => {
      const result = await db.protectionStrategyItem.updateMany({
        where: { id: item.id, verified: false, updatedAt: item.updatedAt },
        data: { verified: true, ...(plan.kind ? { kind: plan.kind } : {}) },
      });
      if (result.count !== 1) {
        throw new DomainError('RECORD_CHANGED', 'Stavka je u međuvremenu izmenjena. Pregledajte je ponovo.', 'CONFLICT');
      }
      await db.decision.create({
        data: {
          projectId,
          stepKey: 'PROTECTION_STRATEGY',
          title: `Strategija zaštite — ${title}: ${[item.value, item.details].filter(Boolean).join(' — ')}`,
          rationale: item.rationale,
          decidedBy: 'USER',
          sourceType: 'USER',
          sourceReference: item.requirementRefs || null,
        },
      });
      return db.protectionStrategyItem.findUniqueOrThrow({ where: { id: item.id } });
    });
  }
}

@Controller('projects/:projectId/strategy')
export class StrategyController {
  constructor(private readonly strategy: StrategyService) {}

  @Get()
  get(@Param('projectId') projectId: string) {
    return this.strategy.get(projectId);
  }

  @Put(':key')
  save(
    @Param('projectId') projectId: string,
    @Param('key', new ZodValidationPipe(itemKey)) key: StrategyItemKey,
    @Body(new ZodValidationPipe(saveItemSchema)) dto: SaveItemDto,
    @Actor() actor: ActorType,
  ) {
    return this.strategy.save(projectId, key, dto, actor);
  }

  @Post(':key/confirm')
  confirm(
    @Param('projectId') projectId: string,
    @Param('key', new ZodValidationPipe(itemKey)) key: StrategyItemKey,
    @Body(new ZodValidationPipe(confirmSchema)) dto: z.infer<typeof confirmSchema>,
    @Actor() actor: ActorType,
  ) {
    return this.strategy.confirm(projectId, key, actor, dto.explicitUserConfirmation);
  }
}

@Module({ controllers: [StrategyController], providers: [StrategyService] })
export class StrategyModule {}
