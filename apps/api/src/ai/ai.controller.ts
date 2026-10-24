import { Controller, Get, Param, Post } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { Actor } from '../common/actor.decorator';
import { AiReviewService } from './ai-review.service';
import { AiSuggestionsService } from './ai-suggestions.service';

@Controller()
export class AiController {
  constructor(
    private readonly reviews: AiReviewService,
    private readonly suggestions: AiSuggestionsService,
  ) {}

  /** Whether the feature is configured; the key itself is never returned. */
  @Get('ai/status')
  status() {
    return this.reviews.status();
  }

  @Get('projects/:projectId/ai-usage')
  usage(@Param('projectId') projectId: string) {
    return this.reviews.usage(projectId);
  }

  @Get('projects/:projectId/steps/:stepKey/ai-reviews')
  list(@Param('projectId') projectId: string, @Param('stepKey') stepKey: string) {
    return this.reviews.list(projectId, stepKey);
  }

  /** „Proveri sa AI". Synchronous: the response is the stored review (OK, REFUSED or ERROR). */
  @Post('projects/:projectId/steps/:stepKey/ai-reviews')
  review(@Param('projectId') projectId: string, @Param('stepKey') stepKey: string) {
    return this.reviews.review(projectId, stepKey);
  }

  /** User only. Writes the value into its target with the user's provenance. */
  @Post('ai-suggestions/:id/accept')
  accept(@Param('id') id: string, @Actor() actor: ActorType) {
    return this.suggestions.accept(id, actor);
  }

  /** User only. */
  @Post('ai-suggestions/:id/reject')
  reject(@Param('id') id: string, @Actor() actor: ActorType) {
    return this.suggestions.reject(id, actor);
  }
}
