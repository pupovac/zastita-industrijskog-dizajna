import { Body, Controller, Get, Injectable, Module, Param, Post, Put } from '@nestjs/common';
import { ActorType, SourceType } from '@prisma/client';
import { z } from 'zod';
import { Actor } from '../common/actor.decorator';
import { orNotFound } from '../common/not-found';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { D1_FIELDS, d1Field } from '../domain/d1-fields';
import { DomainError } from '../domain/domain-error';
import { assertMockAllowed } from '../domain/mock-data';
import { contentChanged, planRecordConfirmation, planRecordEdit } from '../domain/record-provenance';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';

const saveFieldSchema = z
  .object({
    value: z.string().max(10000),
    notes: z.string().trim().max(4000),
    /** null = use the field definition's default. */
    deferredToFiling: z.boolean().nullable(),
    sourceType: z.nativeEnum(SourceType),
    sourceReference: z.string().trim().max(2000).nullable(),
    confidence: z.number().min(0).max(1).nullable(),
  })
  .partial()
  .strict();
type SaveFieldDto = z.infer<typeof saveFieldSchema>;
const confirmSchema = z.object({ explicitUserConfirmation: z.literal(true) }).strict();

/** Data for form D-1 (step 12): every field with its value or "nedostaje". */
@Injectable()
export class D1Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async get(projectId: string) {
    await this.projects.assertExists(projectId);
    const values = await this.prisma.d1FieldValue.findMany({ where: { projectId } });
    return D1_FIELDS.map((field) => {
      const stored = values.find((v) => v.fieldKey === field.key) ?? null;
      const value = stored?.value ?? '';
      return {
        ...field,
        value: stored,
        missing: !value.trim(),
        deferredToFiling: stored?.deferredToFiling ?? field.deferredToFiling,
      };
    });
  }

  async save(projectId: string, fieldKey: string, dto: SaveFieldDto, actor: ActorType) {
    if (!d1Field(fieldKey)) throw new DomainError('D1_FIELD_UNKNOWN', 'Nepoznato polje obrasca D-1.', 'NOT_FOUND');
    assertMockAllowed(await this.projects.get(projectId), dto.sourceReference);
    const stored = await this.prisma.d1FieldValue.findUnique({ where: { projectId_fieldKey: { projectId, fieldKey } } });
    if (!stored) {
      return this.prisma.d1FieldValue.create({
        data: { ...dto, sourceType: dto.sourceType ?? (actor === 'USER' ? 'USER' : 'AGENT_INFERENCE'), projectId, fieldKey },
      });
    }
    const edit = planRecordEdit(stored, actor, contentChanged(stored, dto, ['value']));
    return this.prisma.d1FieldValue.update({ where: { id: stored.id }, data: { ...dto, ...edit } });
  }

  async confirm(projectId: string, fieldKey: string, actor: ActorType, explicitUserConfirmation: boolean) {
    const stored = orNotFound(
      await this.prisma.d1FieldValue.findUnique({ where: { projectId_fieldKey: { projectId, fieldKey } } }),
      'Polje D-1',
    );
    planRecordConfirmation(stored, { actor, explicitUserConfirmation });
    const result = await this.prisma.d1FieldValue.updateMany({
      where: { id: stored.id, verified: false, updatedAt: stored.updatedAt },
      data: { verified: true },
    });
    if (result.count !== 1) {
      throw new DomainError('RECORD_CHANGED', 'Polje je u međuvremenu izmenjeno. Pregledajte ga ponovo.', 'CONFLICT');
    }
    return this.prisma.d1FieldValue.findUniqueOrThrow({ where: { id: stored.id } });
  }
}

@Controller('projects/:projectId/d1')
export class D1Controller {
  constructor(private readonly d1: D1Service) {}

  @Get()
  get(@Param('projectId') projectId: string) {
    return this.d1.get(projectId);
  }

  @Put(':fieldKey')
  save(
    @Param('projectId') projectId: string,
    @Param('fieldKey') fieldKey: string,
    @Body(new ZodValidationPipe(saveFieldSchema)) dto: SaveFieldDto,
    @Actor() actor: ActorType,
  ) {
    return this.d1.save(projectId, fieldKey, dto, actor);
  }

  @Post(':fieldKey/confirm')
  confirm(
    @Param('projectId') projectId: string,
    @Param('fieldKey') fieldKey: string,
    @Body(new ZodValidationPipe(confirmSchema)) dto: z.infer<typeof confirmSchema>,
    @Actor() actor: ActorType,
  ) {
    return this.d1.confirm(projectId, fieldKey, actor, dto.explicitUserConfirmation);
  }
}

@Module({ controllers: [D1Controller], providers: [D1Service] })
export class D1Module {}
