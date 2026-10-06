import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { Actor } from '../common/actor.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  AnswerOpenQuestionDto,
  answerOpenQuestionSchema,
  CreateDecisionDto,
  createDecisionSchema,
  CreateOpenQuestionDto,
  createOpenQuestionSchema,
} from './records.dto';
import { RecordsService } from './records.service';

@Controller()
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get('projects/:projectId/open-questions')
  listOpenQuestions(@Param('projectId') projectId: string, @Query('stepKey') stepKey?: string) {
    return this.records.listOpenQuestions(projectId, stepKey);
  }

  @Get('projects/:projectId/decisions')
  listDecisions(@Param('projectId') projectId: string) {
    return this.records.listDecisions(projectId);
  }

  @Post('projects/:projectId/open-questions')
  createOpenQuestion(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createOpenQuestionSchema)) dto: CreateOpenQuestionDto,
    @Actor() actor: ActorType,
  ) {
    return this.records.createOpenQuestion(projectId, dto, actor);
  }

  @Post('open-questions/:id/answer')
  answerOpenQuestion(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(answerOpenQuestionSchema)) dto: AnswerOpenQuestionDto,
    @Actor() actor: ActorType,
  ) {
    return this.records.answerOpenQuestion(id, dto, actor);
  }

  @Post('projects/:projectId/decisions')
  createDecision(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createDecisionSchema)) dto: CreateDecisionDto,
    @Actor() actor: ActorType,
  ) {
    return this.records.createDecision(projectId, dto, actor);
  }
}
