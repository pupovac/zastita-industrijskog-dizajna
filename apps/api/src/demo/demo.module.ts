import { Module } from '@nestjs/common';
import { ResearchModule } from '../research/research.module';
import { DemoSeedService } from './demo-seed.service';

/** Not part of the HTTP API: the demo seed runs only from the command line (npm run db:seed:demo). */
@Module({ imports: [ResearchModule], providers: [DemoSeedService], exports: [DemoSeedService] })
export class DemoModule {}
