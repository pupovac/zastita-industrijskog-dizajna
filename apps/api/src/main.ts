import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadDotEnv } from './common/load-env';

async function bootstrap() {
  // `nest start` / `node dist/main.js` do not read apps/api/.env on their own;
  // without this PrismaService fails with "Environment variable not found: DATABASE_URL".
  loadDotEnv();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API: http://localhost:${port}/api`);
}

void bootstrap();
