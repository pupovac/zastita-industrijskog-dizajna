import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { Actor } from '../common/actor.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { STEP_DEFINITIONS } from '../domain/steps';
import { TransitionStepDto, transitionStepSchema } from './steps.dto';
import { StepsService } from './steps.service';

@Controller()
export class StepsController {
  constructor(private readonly steps: StepsService) {}

  @Get('step-definitions')
  definitions() {
    return STEP_DEFINITIONS.map((s, i) => ({ ...s, position: i + 1 }));
  }

  @Get('projects/:projectId/steps')
  list(@Param('projectId') projectId: string) {
    return this.steps.list(projectId);
  }

  @Get('projects/:projectId/steps/:stepKey/history')
  history(@Param('projectId') projectId: string, @Param('stepKey') stepKey: string) {
    return this.steps.history(projectId, stepKey);
  }

  @Post('projects/:projectId/steps/:stepKey/transition')
  transition(
    @Param('projectId') projectId: string,
    @Param('stepKey') stepKey: string,
    @Body(new ZodValidationPipe(transitionStepSchema)) dto: TransitionStepDto,
    @Actor() actor: ActorType,
  ) {
    return this.steps.transition(projectId, stepKey, dto, actor);
  }
}
