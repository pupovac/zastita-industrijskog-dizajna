import { Body, Controller, Get, Injectable, Module, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ActorType, InformationKind, SourceType } from '@prisma/client';
import { z } from 'zod';
import { Actor } from '../common/actor.decorator';
import { orNotFound } from '../common/not-found';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DomainError } from '../domain/domain-error';
import { assertValidNewFact } from '../domain/fact-rules';
import { FUNCTION_ANALYSIS_QUESTION_COUNT, FUNCTION_ANALYSIS_QUESTIONS } from '../domain/function-analysis';
import { assertMockAllowed } from '../domain/mock-data';
import { contentChanged, planRecordConfirmation, planRecordEdit } from '../domain/record-provenance';
import { PrismaService } from '../prisma/prisma.service';

const answerSchema = z
  .object({
    answer: z.string().trim().max(10000),
    kind: z.nativeEnum(InformationKind).optional(),
    sourceType: z.nativeEnum(SourceType).optional(),
    sourceReference: z.string().trim().max(2000).nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
  })
  .strict();
type AnswerDto = z.infer<typeof answerSchema>;
const confirmSchema = z.object({ explicitUserConfirmation: z.literal(true) }).strict();

/** Answers of the module „Tehnička funkcija naspram vizuelnog dizajna" (8 questions per feature). */
@Injectable()
export class FunctionAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async save(featureId: string, questionNumber: number, dto: AnswerDto, actor: ActorType) {
    if (questionNumber < 1 || questionNumber > FUNCTION_ANALYSIS_QUESTION_COUNT) {
      throw new DomainError('QUESTION_NUMBER_INVALID', 'Pitanje mora biti od 1 do 8.', 'NOT_FOUND');
    }
    const feature = orNotFound(
      await this.prisma.designFeature.findUnique({ where: { id: featureId }, include: { project: true } }),
      'Vizuelna karakteristika',
    );
    assertMockAllowed(feature.project, dto.sourceReference);
    const stored = await this.prisma.functionAnalysisAnswer.findUnique({
      where: { designFeatureId_questionNumber: { designFeatureId: featureId, questionNumber } },
    });
    const kind = dto.kind ?? stored?.kind ?? (actor === 'USER' ? 'USER_STATEMENT' : 'AI_INFERENCE');
    const sourceType = dto.sourceType ?? stored?.sourceType ?? (actor === 'USER' ? 'USER' : 'AGENT_INFERENCE');
    if (!(stored?.verified && kind === 'FACT')) {
      assertValidNewFact({ kind, sourceType, sourceReference: dto.sourceReference ?? stored?.sourceReference });
    }
    if (!stored) {
      return this.prisma.functionAnalysisAnswer.create({
        data: { ...dto, kind, sourceType, designFeatureId: featureId, questionNumber },
      });
    }
    const edit = planRecordEdit(stored, actor, contentChanged(stored, dto, ['answer']));
    return this.prisma.functionAnalysisAnswer.update({
      where: { id: stored.id },
      data: { ...dto, kind, sourceType, ...edit },
    });
  }

  async confirm(featureId: string, questionNumber: number, actor: ActorType, explicitUserConfirmation: boolean) {
    const stored = orNotFound(
      await this.prisma.functionAnalysisAnswer.findUnique({
        where: { designFeatureId_questionNumber: { designFeatureId: featureId, questionNumber } },
      }),
      'Odgovor',
    );
    const plan = planRecordConfirmation(stored, { actor, explicitUserConfirmation });
    return this.prisma.functionAnalysisAnswer.update({
      where: { id: stored.id },
      data: { verified: true, ...(plan.kind ? { kind: plan.kind } : {}) },
    });
  }
}

@Controller()
export class FunctionAnalysisController {
  constructor(private readonly analysis: FunctionAnalysisService) {}

  @Get('function-analysis/questions')
  questions() {
    return FUNCTION_ANALYSIS_QUESTIONS.map((text, i) => ({ number: i + 1, text }));
  }

  @Put('design-features/:featureId/function-analysis/:questionNumber')
  save(
    @Param('featureId') featureId: string,
    @Param('questionNumber', ParseIntPipe) questionNumber: number,
    @Body(new ZodValidationPipe(answerSchema)) dto: AnswerDto,
    @Actor() actor: ActorType,
  ) {
    return this.analysis.save(featureId, questionNumber, dto, actor);
  }

  @Post('design-features/:featureId/function-analysis/:questionNumber/confirm')
  confirm(
    @Param('featureId') featureId: string,
    @Param('questionNumber', ParseIntPipe) questionNumber: number,
    @Body(new ZodValidationPipe(confirmSchema)) dto: z.infer<typeof confirmSchema>,
    @Actor() actor: ActorType,
  ) {
    return this.analysis.confirm(featureId, questionNumber, actor, dto.explicitUserConfirmation);
  }
}

@Module({ controllers: [FunctionAnalysisController], providers: [FunctionAnalysisService] })
export class FunctionAnalysisModule {}
