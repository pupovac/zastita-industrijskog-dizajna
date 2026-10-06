import { Module } from '@nestjs/common';
import { CollectionsModule } from './collections/collections.module';
import { D1Module } from './d1/d1.module';
import { DraftingModule } from './drafting/drafting.module';
import { FactsModule } from './facts/facts.module';
import { FunctionAnalysisModule } from './features/function-analysis.module';
import { FilesModule } from './files/files.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { PackageModule } from './package/package.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { QuestionsModule } from './questions/questions.module';
import { RecordsModule } from './records/records.module';
import { ResearchModule } from './research/research.module';
import { ReviewModule } from './review/review.module';
import { StepsModule } from './steps/steps.module';
import { StrategyModule } from './strategy/strategy.module';

@Module({
  imports: [
    PrismaModule,
    ProjectsModule,
    StepsModule,
    QuestionsModule,
    FactsModule,
    FilesModule,
    RecordsModule,
    KnowledgeModule,
    ResearchModule,
    CollectionsModule,
    FunctionAnalysisModule,
    StrategyModule,
    DraftingModule,
    ReviewModule,
    D1Module,
    PackageModule,
  ],
})
export class AppModule {}
