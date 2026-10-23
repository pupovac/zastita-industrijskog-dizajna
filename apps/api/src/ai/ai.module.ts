import { Module } from '@nestjs/common';
import { CollectionsModule } from '../collections/collections.module';
import { D1Module } from '../d1/d1.module';
import { DraftingModule } from '../drafting/drafting.module';
import { StrategyModule } from '../strategy/strategy.module';
import { AiConfig } from './ai-config';
import { AiReviewService } from './ai-review.service';
import { AiSuggestionsService } from './ai-suggestions.service';
import { AiController } from './ai.controller';
import { AI_MODEL_CLIENT, AnthropicModelClient } from './anthropic-client';
import { StepContextService } from './step-context.service';

/**
 * AI review of a step through the Claude API (official SDK). Without ANTHROPIC_API_KEY the
 * module still loads: the status endpoint reports `not_configured` and a review returns 409.
 */
@Module({
  imports: [CollectionsModule, DraftingModule, D1Module, StrategyModule],
  controllers: [AiController],
  providers: [
    // Reads process.env once; a factory keeps Nest from trying to inject the constructor's `env` argument.
    { provide: AiConfig, useFactory: () => new AiConfig() },
    StepContextService,
    AiReviewService,
    AiSuggestionsService,
    { provide: AI_MODEL_CLIENT, useClass: AnthropicModelClient },
  ],
  exports: [AiConfig, AiReviewService],
})
export class AiModule {}
