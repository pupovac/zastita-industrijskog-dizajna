import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { Actor } from '../common/actor.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  ConfirmFactDto,
  confirmFactSchema,
  CreateFactDto,
  createFactSchema,
  UpdateFactDto,
  updateFactSchema,
} from './facts.dto';
import { FactsService } from './facts.service';

@Controller()
export class FactsController {
  constructor(private readonly facts: FactsService) {}

  @Get('projects/:projectId/facts')
  list(@Param('projectId') projectId: string) {
    return this.facts.list(projectId);
  }

  @Post('projects/:projectId/facts')
  create(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createFactSchema)) dto: CreateFactDto,
    @Actor() actor: ActorType,
  ) {
    return this.facts.create(projectId, dto, actor);
  }

  @Patch('facts/:factId')
  update(
    @Param('factId') factId: string,
    @Body(new ZodValidationPipe(updateFactSchema)) dto: UpdateFactDto,
    @Actor() actor: ActorType,
  ) {
    return this.facts.update(factId, dto, actor);
  }

  @Post('facts/:factId/confirm')
  confirm(
    @Param('factId') factId: string,
    @Body(new ZodValidationPipe(confirmFactSchema)) dto: ConfirmFactDto,
    @Actor() actor: ActorType,
  ) {
    return this.facts.confirm(factId, dto, actor);
  }
}
