import { Body, Controller, Get, Module, Param, Patch, Post, Put } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { z } from 'zod';
import { Actor } from '../common/actor.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { findPatentTerms } from '../domain/patent-terms';
import {
  CreateSectionDto,
  createSectionSchema,
  DraftContentDto,
  draftContentSchema,
  terminologyCheckSchema,
  UpdateSectionDto,
  updateSectionSchema,
} from './drafting.dto';
import { DraftingService } from './drafting.service';

const confirmSchema = z.object({ explicitUserConfirmation: z.literal(true) }).strict();

@Controller()
export class DraftingController {
  constructor(private readonly drafting: DraftingService) {}

  @Get('projects/:projectId/application-sections')
  list(@Param('projectId') projectId: string) {
    return this.drafting.list(projectId);
  }

  @Post('projects/:projectId/application-sections')
  create(@Param('projectId') projectId: string, @Body(new ZodValidationPipe(createSectionSchema)) dto: CreateSectionDto) {
    return this.drafting.createSection(projectId, dto);
  }

  @Patch('application-sections/:sectionId')
  update(@Param('sectionId') sectionId: string, @Body(new ZodValidationPipe(updateSectionSchema)) dto: UpdateSectionDto) {
    return this.drafting.updateSection(sectionId, dto);
  }

  @Get('application-sections/:sectionId/versions')
  versions(@Param('sectionId') sectionId: string) {
    return this.drafting.versions(sectionId);
  }

  @Post('application-sections/:sectionId/versions')
  addVersion(
    @Param('sectionId') sectionId: string,
    @Body(new ZodValidationPipe(draftContentSchema)) dto: DraftContentDto,
    @Actor() actor: ActorType,
  ) {
    return this.drafting.addVersion(sectionId, dto, actor);
  }

  @Put('application-sections/:sectionId/working-draft')
  saveWorkingDraft(
    @Param('sectionId') sectionId: string,
    @Body(new ZodValidationPipe(draftContentSchema)) dto: DraftContentDto,
    @Actor() actor: ActorType,
  ) {
    return this.drafting.saveWorkingDraft(sectionId, dto, actor);
  }

  @Post('application-sections/:sectionId/confirm')
  confirm(
    @Param('sectionId') sectionId: string,
    @Body(new ZodValidationPipe(confirmSchema)) dto: z.infer<typeof confirmSchema>,
    @Actor() actor: ActorType,
  ) {
    return this.drafting.confirm(sectionId, dto.explicitUserConfirmation, actor);
  }

  /** Patent terminology check for any text (used by the drafting agent before saving). */
  @Post('terminology-check')
  terminologyCheck(@Body(new ZodValidationPipe(terminologyCheckSchema)) dto: { text: string }) {
    return { issues: findPatentTerms(dto.text) };
  }
}

@Module({ controllers: [DraftingController], providers: [DraftingService], exports: [DraftingService] })
export class DraftingModule {}
