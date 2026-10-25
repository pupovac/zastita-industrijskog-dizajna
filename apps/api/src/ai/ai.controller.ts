import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { Actor } from '../common/actor.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DecideDraftSectionDto, decideDraftSectionSchema, GenerateDraftDto, generateDraftSchema } from './ai-draft.dto';
import { AiDraftService } from './ai-draft.service';
import { AiReviewService } from './ai-review.service';
import { AiSuggestionsService } from './ai-suggestions.service';

@Controller()
export class AiController {
  constructor(
    private readonly reviews: AiReviewService,
    private readonly suggestions: AiSuggestionsService,
    private readonly drafts: AiDraftService,
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

  // --- AI draft of the description (step 10, FUZZ-142) ---------------------------------

  @Get('projects/:projectId/ai-drafts')
  listDrafts(@Param('projectId') projectId: string) {
    return this.drafts.list(projectId);
  }

  /** „Generiši nacrt opisa" / „Proširi i doteraj". User only. Synchronous: the response is the stored draft. */
  @Post('projects/:projectId/ai-drafts')
  generateDraft(@Param('projectId') projectId: string, @Body(new ZodValidationPipe(generateDraftSchema)) dto: GenerateDraftDto, @Actor() actor: ActorType) {
    return this.drafts.generate(projectId, dto, actor);
  }

  @Get('ai-drafts/:draftId')
  draft(@Param('draftId') draftId: string) {
    return this.drafts.get(draftId);
  }

  /** „Prihvati kao radnu verziju". User only; `replaceConfirmed: true` for a section confirmed at draft time. */
  @Post('ai-drafts/:draftId/sections/:sectionKey/accept')
  acceptDraftSection(
    @Param('draftId') draftId: string,
    @Param('sectionKey') sectionKey: string,
    @Body(new ZodValidationPipe(decideDraftSectionSchema)) dto: DecideDraftSectionDto,
    @Actor() actor: ActorType,
  ) {
    return this.drafts.decide(draftId, sectionKey, 'accept', dto, actor);
  }

  /** „Odbaci". User only. */
  @Post('ai-drafts/:draftId/sections/:sectionKey/reject')
  rejectDraftSection(@Param('draftId') draftId: string, @Param('sectionKey') sectionKey: string, @Actor() actor: ActorType) {
    return this.drafts.decide(draftId, sectionKey, 'reject', { replaceConfirmed: false }, actor);
  }
}
