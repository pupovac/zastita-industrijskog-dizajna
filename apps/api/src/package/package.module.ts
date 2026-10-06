import { Body, Controller, Get, Module, Param, Post, Res } from '@nestjs/common';
import { ActorType, SignoffRole } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';
import { Actor } from '../common/actor.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PackageService } from './package.service';

const signoffSchema = z
  .object({
    reviewerName: z.string().trim().min(1).max(300),
    role: z.nativeEnum(SignoffRole),
    note: z.string().trim().max(4000).default(''),
  })
  .strict();

@Controller()
export class PackageController {
  constructor(private readonly pkg: PackageService) {}

  /** Checklist (§16), generation gate and all generated versions. */
  @Get('projects/:projectId/package')
  status(@Param('projectId') projectId: string) {
    return this.pkg.status(projectId);
  }

  @Post('projects/:projectId/package/generate')
  generate(@Param('projectId') projectId: string, @Actor() actor: ActorType) {
    return this.pkg.generate(projectId, actor);
  }

  @Get('generated-documents/:documentId/content')
  async content(@Param('documentId') documentId: string, @Res() res: Response) {
    const doc = await this.pkg.document(documentId);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`);
    res.sendFile(doc.absolutePath);
  }

  @Get('projects/:projectId/signoffs')
  signoffs(@Param('projectId') projectId: string) {
    return this.pkg.signoffs(projectId);
  }

  @Post('projects/:projectId/signoffs')
  signoff(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(signoffSchema)) dto: z.infer<typeof signoffSchema>,
    @Actor() actor: ActorType,
  ) {
    return this.pkg.signoff(projectId, dto, actor);
  }
}

@Module({ controllers: [PackageController], providers: [PackageService] })
export class PackageModule {}
