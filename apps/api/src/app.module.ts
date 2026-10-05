import { Module } from '@nestjs/common';
import { FactsModule } from './facts/facts.module';
import { FilesModule } from './files/files.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { QuestionsModule } from './questions/questions.module';
import { RecordsModule } from './records/records.module';
import { StepsModule } from './steps/steps.module';

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
  ],
})
export class AppModule {}
