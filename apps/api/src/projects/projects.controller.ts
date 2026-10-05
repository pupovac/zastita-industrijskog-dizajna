import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CreateProjectDto, createProjectSchema, UpdateProjectDto, updateProjectSchema } from './projects.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list() {
    return this.projects.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createProjectSchema)) dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @Get(':projectId')
  get(@Param('projectId') projectId: string) {
    return this.projects.get(projectId);
  }

  @Patch(':projectId')
  update(@Param('projectId') projectId: string, @Body(new ZodValidationPipe(updateProjectSchema)) dto: UpdateProjectDto) {
    return this.projects.update(projectId, dto);
  }
}
