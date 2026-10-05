import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile as UploadedFileParam,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActorType } from '@prisma/client';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { Actor } from '../common/actor.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CreateConflictDto,
  createConflictSchema,
  ResolveConflictDto,
  resolveConflictSchema,
  UpdateFileDto,
  updateFileSchema,
  UploadFileDto,
  uploadFileSchema,
} from './files.dto';
import { FilesService, IncomingFile } from './files.service';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

@Controller()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get('projects/:projectId/files')
  list(@Param('projectId') projectId: string) {
    return this.files.list(projectId);
  }

  @Post('projects/:projectId/files')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(
    @Param('projectId') projectId: string,
    @UploadedFileParam() file: IncomingFile | undefined,
    @Body(new ZodValidationPipe(uploadFileSchema)) dto: UploadFileDto,
    @Actor() actor: ActorType,
  ) {
    return this.files.upload(projectId, file, dto, actor);
  }

  @Get('files/:fileId')
  get(@Param('fileId') fileId: string) {
    return this.files.get(fileId);
  }

  /** Serves the stored original, byte for byte. */
  @Get('files/:fileId/content')
  async content(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.files.get(fileId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (file.mimeType === 'image/svg+xml') {
      // SVG can carry scripts; never let it execute when opened directly.
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
    }
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.sendFile(this.files.absolutePath(file));
  }

  @Patch('files/:fileId')
  update(@Param('fileId') fileId: string, @Body(new ZodValidationPipe(updateFileSchema)) dto: UpdateFileDto) {
    return this.files.update(fileId, dto);
  }

  @Get('projects/:projectId/review-issues')
  reviewIssues(@Param('projectId') projectId: string) {
    return this.files.listReviewIssues(projectId);
  }

  @Post('projects/:projectId/conflicts')
  createConflict(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createConflictSchema)) dto: CreateConflictDto,
    @Actor() actor: ActorType,
  ) {
    return this.files.createConflict(projectId, dto, actor);
  }

  @Post('review-issues/:issueId/resolve-conflict')
  resolveConflict(
    @Param('issueId') issueId: string,
    @Body(new ZodValidationPipe(resolveConflictSchema)) dto: ResolveConflictDto,
    @Actor() actor: ActorType,
  ) {
    return this.files.resolveConflict(issueId, dto, actor);
  }
}
