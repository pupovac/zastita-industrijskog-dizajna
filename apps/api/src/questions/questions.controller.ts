import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { Actor } from '../common/actor.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CreateQuestionDto, createQuestionSchema, SaveAnswerDto, saveAnswerSchema } from './questions.dto';
import { QuestionsService } from './questions.service';

@Controller('projects/:projectId')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get('questions')
  list(@Param('projectId') projectId: string, @Query('stepKey') stepKey?: string) {
    return this.questions.list(projectId, stepKey);
  }

  @Post('questions')
  create(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createQuestionSchema)) dto: CreateQuestionDto,
    @Actor() actor: ActorType,
  ) {
    return this.questions.create(projectId, dto, actor);
  }

  @Put('answers/:questionId')
  saveAnswer(
    @Param('projectId') projectId: string,
    @Param('questionId') questionId: string,
    @Body(new ZodValidationPipe(saveAnswerSchema)) dto: SaveAnswerDto,
    @Actor() actor: ActorType,
  ) {
    return this.questions.saveAnswer(projectId, questionId, dto, actor);
  }
}
