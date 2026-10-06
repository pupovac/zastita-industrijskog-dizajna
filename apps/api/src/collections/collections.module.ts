import { Body, Controller, Delete, Get, Module, Param, Patch, Post, Type } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { z } from 'zod';
import { Actor } from '../common/actor.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CollectionConfig } from './collection-config';
import { COLLECTIONS } from './collections';
import { CollectionsService } from './collections.service';

const confirmSchema = z.object({ explicitUserConfirmation: z.literal(true) }).strict();

/**
 * Builds a controller with explicit routes for one collection:
 *   GET    /api/projects/:projectId/<path>
 *   POST   /api/projects/:projectId/<path>
 *   PATCH  /api/<path>/:id
 *   DELETE /api/<path>/:id
 *   POST   /api/<path>/:id/confirm   (user only, { "explicitUserConfirmation": true })
 */
function collectionController(config: CollectionConfig): Type<unknown> {
  @Controller()
  class CollectionController {
    constructor(readonly collections: CollectionsService) {}

    @Get(`projects/:projectId/${config.path}`)
    list(@Param('projectId') projectId: string) {
      return this.collections.list(config, projectId);
    }

    @Post(`projects/:projectId/${config.path}`)
    create(
      @Param('projectId') projectId: string,
      @Body(new ZodValidationPipe(config.createSchema)) dto: Record<string, unknown>,
      @Actor() actor: ActorType,
    ) {
      return this.collections.create(config, projectId, dto, actor);
    }

    @Patch(`${config.path}/:id`)
    update(
      @Param('id') id: string,
      @Body(new ZodValidationPipe(config.updateSchema)) dto: Record<string, unknown>,
      @Actor() actor: ActorType,
    ) {
      return this.collections.update(config, id, dto, actor);
    }

    @Delete(`${config.path}/:id`)
    remove(@Param('id') id: string, @Actor() actor: ActorType) {
      return this.collections.remove(config, id, actor);
    }

    @Post(`${config.path}/:id/confirm`)
    confirm(
      @Param('id') id: string,
      @Body(new ZodValidationPipe(confirmSchema)) dto: z.infer<typeof confirmSchema>,
      @Actor() actor: ActorType,
    ) {
      return this.collections.confirm(config, id, dto.explicitUserConfirmation, actor);
    }
  }
  Object.defineProperty(CollectionController, 'name', { value: `${config.model}CollectionController` });
  return CollectionController;
}

@Module({
  controllers: COLLECTIONS.map(collectionController),
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
