import { Module } from '@nestjs/common';
import { CollectionsModule } from '../collections/collections.module';
import { D1Module } from '../d1/d1.module';
import { DraftingModule } from '../drafting/drafting.module';
import { FilesModule } from '../files/files.module';
import { StrategyModule } from '../strategy/strategy.module';
import { AiConfig } from './ai-config';
import { AiDraftService } from './ai-draft.service';
import { AiReviewService } from './ai-review.service';
import { AiSuggestionsService } from './ai-suggestions.service';
import { AiController } from './ai.controller';
import { AI_MODEL_CLIENT, AnthropicModelClient } from './anthropic-client';
import { DraftContextService } from './draft-context.service';
import { StepContextService } from './step-context.service';

/**
 * AI review of a step and AI draft of the description through the Claude API (official SDK).
 * Without ANTHROPIC_API_KEY the module still loads: the status endpoint reports
 * `not_configured` and a review or a draft returns 409.
 */
@Module({
  imports: [CollectionsModule, DraftingModule, D1Module, StrategyModule, FilesModule],
  controllers: [AiController],
  providers: [
    // Reads process.env once; a factory keeps Nest from trying to inject the constructor's `env` argument.
    { provide: AiConfig, useFactory: () => new AiConfig() },
    StepContextService,
    DraftContextService,
    AiReviewService,
    AiSuggestionsService,
    AiDraftService,
    { provide: AI_MODEL_CLIENT, useClass: AnthropicModelClient },
  ],
  exports: [AiConfig, AiReviewService, AiDraftService],
})
export class AiModule {}
