import { Controller, Get, Param } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';

@Controller('projects/:projectId/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  get(@Param('projectId') projectId: string) {
    return this.knowledge.get(projectId);
  }
}
