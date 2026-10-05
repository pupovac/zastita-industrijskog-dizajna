import { INestApplication } from '@nestjs/common';
import { DomainErrorFilter } from './common/domain-error.filter';

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new DomainErrorFilter());
  app.enableShutdownHooks();
}
