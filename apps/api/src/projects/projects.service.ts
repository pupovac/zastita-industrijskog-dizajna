import { Injectable } from '@nestjs/common';
import { orNotFound } from '../common/not-found';
import { STEP_DEFINITIONS } from '../domain/steps';
import { progressPercent } from '../domain/step-status';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_QUESTIONS } from './default-questions';
import { CreateProjectDto, UpdateProjectDto } from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const projects = await this.prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { steps: { select: { status: true } } },
    });
    return projects.map(({ steps, ...p }) => ({ ...p, progressPercent: progressPercent(steps) }));
  }

  async create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        productName: dto.productName ?? '',
        steps: {
          create: STEP_DEFINITIONS.map((s, i) => ({ stepKey: s.key, position: i + 1 })),
        },
        questions: {
          create: DEFAULT_QUESTIONS.map((q, i) => ({ ...q, position: i + 1, createdByActor: 'SYSTEM' })),
        },
      },
    });
  }

  async get(id: string) {
    const project = orNotFound(
      await this.prisma.project.findUnique({ where: { id }, include: { steps: { select: { status: true } } } }),
      'Projekat',
    );
    const { steps, ...rest } = project;
    return { ...rest, progressPercent: progressPercent(steps) };
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.get(id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async assertExists(id: string) {
    orNotFound(await this.prisma.project.findUnique({ where: { id }, select: { id: true } }), 'Projekat');
  }
}
