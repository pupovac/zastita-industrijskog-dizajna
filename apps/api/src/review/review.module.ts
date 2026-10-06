import { Body, Controller, Get, Module, Param, Patch, Post } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { Actor } from '../common/actor.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { REVIEW_CHECKS } from '../domain/review-rules';
import {
  CreateFindingDto,
  createFindingSchema,
  FindingStatusDto,
  findingStatusSchema,
  UpdateFindingDto,
  updateFindingSchema,
} from './review.dto';
import { ReviewService } from './review.service';

@Controller()
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

  @Get('review-checks')
  checks() {
    return REVIEW_CHECKS;
  }

  @Get('projects/:projectId/review-issues')
  list(@Param('projectId') projectId: string) {
    return this.review.list(projectId);
  }

  @Post('projects/:projectId/review-issues')
  create(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createFindingSchema)) dto: CreateFindingDto,
    @Actor() actor: ActorType,
  ) {
    return this.review.create(projectId, dto, actor);
  }

  @Patch('review-issues/:issueId')
  update(@Param('issueId') issueId: string, @Body(new ZodValidationPipe(updateFindingSchema)) dto: UpdateFindingDto) {
    return this.review.update(issueId, dto);
  }

  @Post('review-issues/:issueId/status')
  changeStatus(
    @Param('issueId') issueId: string,
    @Body(new ZodValidationPipe(findingStatusSchema)) dto: FindingStatusDto,
    @Actor() actor: ActorType,
  ) {
    return this.review.changeStatus(issueId, dto, actor);
  }
}

@Module({ controllers: [ReviewController], providers: [ReviewService] })
export class ReviewModule {}
