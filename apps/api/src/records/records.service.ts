import { Injectable } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { orNotFound } from '../common/not-found';
import { DomainError } from '../domain/domain-error';
import { isDeferredToFiling } from '../domain/filing-deferral';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { AnswerOpenQuestionDto, CreateDecisionDto, CreateOpenQuestionDto } from './records.dto';

/** Open questions and decisions — the parts of project memory that capture what is unresolved and what was decided. */
@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async createOpenQuestion(projectId: string, dto: CreateOpenQuestionDto, actor: ActorType) {
    await this.projects.assertExists(projectId);
    const deferredToFiling = isDeferredToFiling({ stepKey: dto.stepKey ?? null, deferredToFiling: dto.deferredToFiling });
    return this.prisma.openQuestion.create({ data: { ...dto, deferredToFiling, projectId, createdBy: actor } });
  }

  async answerOpenQuestion(id: string, dto: AnswerOpenQuestionDto, actor: ActorType) {
    if (actor !== 'USER') {
      throw new DomainError('ANSWER_REQUIRES_USER', 'Na otvoreno pitanje odgovara korisnik.', 'FORBIDDEN');
    }
    orNotFound(await this.prisma.openQuestion.findUnique({ where: { id } }), 'Otvoreno pitanje');
    return this.prisma.openQuestion.update({
      where: { id },
      data: { answer: dto.answer, status: 'ANSWERED', resolvedAt: new Date() },
    });
  }

  /** Decisions are made by the user; agents propose them as recommendations instead. */
  async createDecision(projectId: string, dto: CreateDecisionDto, actor: ActorType) {
    if (actor !== 'USER') {
      throw new DomainError('DECISION_REQUIRES_USER', 'Odluku donosi korisnik.', 'FORBIDDEN');
    }
    await this.projects.assertExists(projectId);
    return this.prisma.decision.create({ data: { ...dto, projectId, decidedBy: 'USER' } });
  }
}
