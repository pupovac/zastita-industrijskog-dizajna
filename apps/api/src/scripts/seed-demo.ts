import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DemoModule } from '../demo/demo.module';
import { DemoSeedService } from '../demo/demo-seed.service';
import { DEMO_PROJECT_NAME } from '../domain/mock-data';

@Module({ imports: [AppModule, DemoModule] })
class SeedModule {}

/** npm run db:seed:demo — (re)creates only the demo project; real projects are never touched. */
async function main() {
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
  try {
    const result = await app.get(DemoSeedService).seed();
    console.log(`Demo projekat „${DEMO_PROJECT_NAME}" je napravljen: ${result.projectId}`);
    if (result.removedDemoProjects > 0) console.log(`Uklonjen prethodni demo projekat (${result.removedDemoProjects}).`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
